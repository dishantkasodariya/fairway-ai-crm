from abc import ABC, abstractmethod


class Tool(ABC):
    name: str
    description: str
    parameters: dict  # JSON schema for the tool's arguments

    @abstractmethod
    def run(self, **kwargs) -> str:
        raise NotImplementedError

    def spec(self) -> dict:
        return {"name": self.name, "description": self.description, "parameters": self.parameters}
