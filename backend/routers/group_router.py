"""Group / member / invitation endpoints — GET/POST only, no path params.

Ids ride in the query string (GET) or JSON body (POST).
"""

from typing import Annotated

from fastapi import APIRouter, Depends

from backend.core.db_manager import get_db
from backend.models.group import (
    CreateGroupRequest,
    CreateInvitationRequest,
    DeleteGroupRequest,
    GroupPet,
    GroupSummary,
    InvitationCreated,
    InvitationPreview,
    JoinGroupRequest,
    MemberSummary,
    RemoveMemberRequest,
    UpdateMemberRoleRequest,
)
from backend.models.user import User
from backend.services.auth_service import get_current_user
from backend.services.group_service import GroupService

router = APIRouter(prefix="/group", tags=["group"])


def get_group_service() -> GroupService:
    return GroupService(get_db())


@router.post("/create", response_model=GroupSummary)
async def create_group(
    body: CreateGroupRequest,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[GroupService, Depends(get_group_service)],
) -> GroupSummary:
    return await service.create_group(body, user.id)


@router.post("/delete")
async def delete_group(
    body: DeleteGroupRequest,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[GroupService, Depends(get_group_service)],
) -> dict:
    return await service.delete_group(body.group_id, user.id)


@router.get("/my_groups", response_model=list[GroupSummary])
async def my_groups(
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[GroupService, Depends(get_group_service)],
) -> list[GroupSummary]:
    return await service.list_my_groups(user.id)


@router.get("/members", response_model=list[MemberSummary])
async def list_members(
    group_id: str,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[GroupService, Depends(get_group_service)],
) -> list[MemberSummary]:
    return await service.list_members(group_id, user.id)


@router.post("/member/update_role")
async def update_member_role(
    body: UpdateMemberRoleRequest,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[GroupService, Depends(get_group_service)],
) -> dict:
    return await service.update_member_role(body, user.id)


@router.post("/member/remove")
async def remove_member(
    body: RemoveMemberRequest,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[GroupService, Depends(get_group_service)],
) -> dict:
    return await service.remove_member(body, user.id)


@router.post("/invitation/create", response_model=InvitationCreated)
async def create_invitation(
    body: CreateInvitationRequest,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[GroupService, Depends(get_group_service)],
) -> InvitationCreated:
    return await service.create_invitation(user.id, body)


@router.get("/invitation/preview", response_model=InvitationPreview)
async def preview_invitation(
    invite_code: str,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[GroupService, Depends(get_group_service)],
) -> InvitationPreview:
    return await service.get_invitation_preview(invite_code, user.id)


@router.post("/join", response_model=GroupSummary)
async def join_group(
    body: JoinGroupRequest,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[GroupService, Depends(get_group_service)],
) -> GroupSummary:
    return await service.join_by_code(body, user.id)


@router.get("/pets", response_model=list[GroupPet])
async def list_group_pets(
    group_id: str,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[GroupService, Depends(get_group_service)],
) -> list[GroupPet]:
    return await service.list_group_pets(group_id, user.id)
