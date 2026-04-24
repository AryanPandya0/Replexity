from enum import Enum
from typing import Optional, OrderedDict
from collections import OrderedDict as CollectionsOrderedDict
import threading
import uuid
from backend.api.schemas import AnalysisResult

class TaskStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class AnalysisTask:
    def __init__(self, task_id: str):
        self.task_id = task_id
        self.status = TaskStatus.PENDING
        self.result: Optional[AnalysisResult] = None
        self.error: Optional[str] = None

# In-memory task store
MAX_TASK_STORE_SIZE = 100
_task_store: CollectionsOrderedDict[str, AnalysisTask] = CollectionsOrderedDict()
_store_lock = threading.Lock()

def create_task() -> AnalysisTask:
    with _store_lock:
        if len(_task_store) >= MAX_TASK_STORE_SIZE:
            _task_store.popitem(last=False)
        task_id = str(uuid.uuid4())
        task = AnalysisTask(task_id)
        _task_store[task_id] = task
    return task

def get_task(task_id: str) -> Optional[AnalysisTask]:
    with _store_lock:
        return _task_store.get(task_id)
