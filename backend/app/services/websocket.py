from fastapi import WebSocket
from typing import Dict, List, Any
import json

class ConnectionManager:
    def __init__(self):
        # Maps user_id -> List of active WebSocket connections
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: Any, user_id: int):
        if user_id in self.active_connections:
            # Message can be a dict/list or string
            if isinstance(message, dict) or isinstance(message, list):
                message_str = json.dumps(message, default=str)
            else:
                message_str = str(message)
            
            # Send to all active tabs/connections of the user
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(message_str)
                except Exception:
                    # Connection might have died, let disconnect clean it up
                    pass

    async def broadcast(self, message: Any):
        if isinstance(message, dict) or isinstance(message, list):
            message_str = json.dumps(message, default=str)
        else:
            message_str = str(message)

        for user_id, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_text(message_str)
                except Exception:
                    pass

manager = ConnectionManager()
