"""Pet endpoints — GET/POST only, no path params.

Photo upload accepts multipart with the pet_id sent as a form field alongside
the binary, since `UploadFile` and a JSON body don't mix.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, UploadFile

from backend.core.db_manager import get_db
from backend.models.pet import (
    AssignPetToGroupRequest,
    CreatePetRequest,
    DeletePetRequest,
    GroupAssignmentInfo,
    PetDetails,
    PetSummary,
    UpdatePetRequest,
)
from backend.models.user import User
from backend.services.auth_service import get_current_user
from backend.services.pet_service import PetService

router = APIRouter(prefix="/pet", tags=["pet"])


def get_pet_service() -> PetService:
    return PetService(get_db())


@router.post("/create", response_model=PetDetails)
async def create_pet(
    body: CreatePetRequest,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[PetService, Depends(get_pet_service)],
) -> PetDetails:
    return await service.create_pet(body, user.id)


@router.get("/accessible", response_model=list[PetSummary])
async def list_accessible_pets(
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[PetService, Depends(get_pet_service)],
) -> list[PetSummary]:
    return await service.list_accessible_pets(user.id)


@router.get("/details", response_model=PetDetails)
async def pet_details(
    pet_id: str,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[PetService, Depends(get_pet_service)],
) -> PetDetails:
    return await service.get_pet_details(pet_id, user.id)


@router.post("/update", response_model=PetDetails)
async def update_pet(
    body: UpdatePetRequest,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[PetService, Depends(get_pet_service)],
) -> PetDetails:
    return await service.update_pet(body, user.id)


@router.post("/delete")
async def delete_pet(
    body: DeletePetRequest,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[PetService, Depends(get_pet_service)],
) -> dict:
    return await service.delete_pet(body.pet_id, user.id)


@router.post("/assign_group", response_model=GroupAssignmentInfo)
async def assign_pet_to_group(
    body: AssignPetToGroupRequest,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[PetService, Depends(get_pet_service)],
) -> GroupAssignmentInfo:
    return await service.assign_to_group(body, user.id)


@router.get("/current_group", response_model=GroupAssignmentInfo)
async def get_pet_current_group(
    pet_id: str,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[PetService, Depends(get_pet_service)],
) -> GroupAssignmentInfo:
    return await service.get_pet_current_group(pet_id, user.id)


@router.post("/photo/upload")
async def upload_pet_photo(
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[PetService, Depends(get_pet_service)],
    pet_id: Annotated[str, Form(...)],
    file: UploadFile = File(..., description="Pet photo (JPEG / PNG / GIF / WebP, ≤10 MB)"),
) -> dict:
    return await service.upload_pet_photo(pet_id, user.id, file)
