"""
Custom OpenAI Model Client Wrapper that forces tool calling.

This wrapper overrides the create() method to always use tool_choice='required',
preventing the LLM from hallucinating tool results instead of actually calling them.

Workaround for AutoGen 0.7.5 bug where extra_create_args tool_choice gets overwritten.
"""

from typing import Sequence, Literal, Optional, Mapping, Any
from autogen_ext.models.openai import OpenAIChatCompletionClient
from autogen_core import CancellationToken
from autogen_core.models import LLMMessage, CreateResult
from autogen_core.tools import Tool, ToolSchema
from pydantic import BaseModel


class ForcedToolModelClient(OpenAIChatCompletionClient):
    """
    Custom wrapper around OpenAIChatCompletionClient that FORCES tool calling.

    Overrides create() to always use tool_choice='required' when tools are present,
    preventing the LLM from skipping tool execution.
    """

    async def create(
        self,
        messages: Sequence[LLMMessage],
        *,
        tools: Sequence[Tool | ToolSchema] = [],
        tool_choice: Tool | Literal["auto", "required", "none"] = "auto",
        json_output: Optional[bool | type[BaseModel]] = None,
        extra_create_args: Mapping[str, Any] = {},
        cancellation_token: Optional[CancellationToken] = None,
    ) -> CreateResult:
        """
        Override create() to force tool_choice='required' when tools are available.

        If tools are provided, this method forces tool_choice='required' regardless
        of what was passed in the tool_choice parameter. This prevents the LLM from
        hallucinating tool results instead of actually calling them.
        """
        # If tools are provided and tool_choice is 'auto', force it to 'required'
        if len(tools) > 0 and tool_choice == "auto":
            tool_choice = "required"
            print(f"🔧 ForcedToolModelClient: Forcing tool_choice='required' ({len(tools)} tools available)")

        # Call parent's create() with the modified tool_choice
        return await super().create(
            messages=messages,
            tools=tools,
            tool_choice=tool_choice,
            json_output=json_output,
            extra_create_args=extra_create_args,
            cancellation_token=cancellation_token,
        )
