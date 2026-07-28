"""
Unit tests for SSE event engine and task queue dispatcher.
"""
import asyncio
import pytest
from fastapi.testclient import TestClient
from main import app
from api.events import publish_event, subscribe_events, unsubscribe_events
from api.tasks import create_task
from api.queue import dispatch_github_analysis

client = TestClient(app)

def test_sse_pub_sub():
    async def _async_test():
        task = create_task()
        queue = await subscribe_events(task.task_id)

        await publish_event(task.task_id, "test_step", "Testing SSE payload", 50)
        
        event = await asyncio.wait_for(queue.get(), timeout=2.0)
        assert event["task_id"] == task.task_id
        assert event["step"] == "test_step"
        assert event["progress"] == 50

        await unsubscribe_events(task.task_id, queue)

    asyncio.run(_async_test())
