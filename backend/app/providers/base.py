from abc import ABC, abstractmethod


class AIProvider(ABC):
    @abstractmethod
    def generate(self, message: str) -> str:
        pass