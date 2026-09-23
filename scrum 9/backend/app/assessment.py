from typing import Annotated, Literal, Self
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field, model_validator

DataType = Literal[
    "names", "email", "health", "financial", "location", "online_ids",
    "other", "unknown",
]
Answer = Literal["yes", "no", "unsure"]
RequiredText = Annotated[str, Field(min_length=1, max_length=2000)]
OptionalText = Annotated[str, Field(max_length=2000)]


class AssessmentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, strict=True)

    schema_version: Literal["1.0"]
    data_types: Annotated[list[DataType], Field(min_length=1, max_length=8)]
    other_data_types: OptionalText = ""
    people: RequiredText
    organizations: RequiredText
    external_access: Answer
    external_access_details: OptionalText = ""
    identifiable_exchange: Answer
    data_movement: RequiredText
    purpose: RequiredText
    expected_output: RequiredText
    secondary_use: Answer
    secondary_use_details: OptionalText = ""
    reidentification: Answer
    reidentification_details: OptionalText = ""

    @model_validator(mode="after")
    def validate_details(self) -> Self:
        if len(set(self.data_types)) != len(self.data_types):
            raise ValueError("Select each data type only once.")
        conditions = [
            ("other" in self.data_types, self.other_data_types, "other data types"),
            (self.external_access == "yes", self.external_access_details,
             "external access"),
            (self.secondary_use == "yes", self.secondary_use_details,
             "secondary use"),
            (self.reidentification == "yes", self.reidentification_details,
             "re-identification"),
        ]
        for required, details, label in conditions:
            if required and not details:
                raise ValueError(f"Describe {label}, or say what is still unknown.")
        return self


class AssessmentReceipt(BaseModel):
    submission_id: UUID = Field(default_factory=uuid4)
    status: Literal["validated"] = "validated"
    schema_version: Literal["1.0"] = "1.0"
    stored: Literal[False] = False
    scored: Literal[False] = False
