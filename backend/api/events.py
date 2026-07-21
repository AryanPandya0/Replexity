"""
Server-Sent Events (SSE) Engine for Real-Time Analysis Progress.
"""
import asyncio
import json
from typing import Dict, Set
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

router = APIRouter(tags=["events"])

# In-memory pub/sub queues for active SSE connections
_event_subscribers: Dict[str, Set[asyncio.Queue]] = {}
_subscriber_lock = asyncio.Lock()

async def subscribe_events(task_id: str) -> asyncio.Queue:
    """Subscribe to real-time events for a specific task."""
    queue = asyncio.Queue()
    async with _subscriber_lock:
        if task_id not in _event_subscribers:
            _event_subscribers[task_id] = set()
        _event_subscribers[task_id].add(queue)
    return queue

async def unsubscribe_events(task_id: str, queue: asyncio.Queue):
    """Unsubscribe an active SSE listener queue."""
    async with _subscriber_lock:
        if task_id in _event_subscribers:
            _event_subscribers[task_id].discard(queue)
            if not _event_subscribers[task_id]:
                del _event_subscribers[task_id]

def publish_event_sync(task_id: str, step: str, message: str, progress: int, data: dict = None):
    """Synchronous trigger for publishing progress events into async queues."""
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(publish_event(task_id, step, message, progress, data))
    except RuntimeError:
        # No running loop in current thread
        pass

async def publish_event(task_id: str, step: str, message: str, progress: int, data: dict = None):
    """Publish a progress event to all active SSE subscribers of a task."""
    payload = {
        "task_id": task_id,
        "step": step,
        "message": message,
        "progress": min(100, max(0, progress)),
        "data": data or {}
    }
    
    async with _subscriber_lock:
        queues = list(_event_subscribers.get(task_id, []))

    for q in queues:
        await q.put(payload)

@router.get("/events/{task_id}")
async def stream_task_events(task_id: str):
    """
    Server-Sent Events (SSE) endpoint providing real-time task progress.
    """
    queue = await subscribe_events(task_id)

    async def _event_generator():
        try:
            # Send initial connection event
            yield f"data: {json.dumps({'step': 'connected', 'message': 'SSE connection established', 'progress': 0})}\n\n"
            
            while True:
                try:
                    event_data = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield f"data: {json.dumps(event_data)}\n\n"
                    
                    if event_data.get("step") in ("completed", "failed"):
                        break
                except asyncio.TimeoutError:
                    # Keep-alive heartbeat ping
                    yield "comment: keepalive\n\n"
        finally:
            await unsubscribe_events(task_id, queue)

    return StreamingResponse(
        _event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
