from typing import Annotated, Optional

from fastapi import APIRouter, Depends, File, Query, UploadFile
from fastapi.responses import FileResponse

from backend.models.food import CreateFoodRequest, FoodType, TargetPet, UpdateFoodRequest
from backend.models.user import UserInfo
from backend.services.auth_service import get_current_user
from backend.services.food_service import FoodService

router = APIRouter(prefix="/foods", tags=["foods"])
food_service = FoodService()


# ================== Food Basic Management ==================


@router.get("/{food_id}/details", response_model=dict)
async def get_food_details(food_id: str, current_user: Annotated[UserInfo, Depends(get_current_user)]) -> dict:
    """
    Returns comprehensive information about a specific food item including all nutritional data and specifications.

    Authorization: Group membership required (any role: creator, member, or viewer)

    This endpoint provides complete food profile information including:
    - Brand and product identification
    - Food type and target pet species
    - Unit weight specifications for serving calculations
    - Complete nutritional breakdown (calories, protein, fat, moisture, carbohydrates)
    - Photo availability status
    - Group association information
    - Calculated convenience fields (calories per unit)

    The response supports both food selection and detailed nutrition analysis use cases,
    providing data in format suitable for detailed food information displays.

    Returns:
    - Complete food profile with all nutritional information
    - Calculated fields like calories per unit for serving calculations
    - Photo availability status for visual identification
    - Group context for collaborative food database management
    """
    try:
        food_details = await food_service.get_food_details(food_id, current_user.id)
        return {"status": 1, "data": food_details.model_dump(), "message": "Food details retrieved successfully"}
    except Exception as e:
        raise e


@router.post("/{food_id}/update", response_model=dict)
async def update_food_information(
    food_id: str, request: UpdateFoodRequest, current_user: Annotated[UserInfo, Depends(get_current_user)]
) -> dict:
    """
    Allows authorized users to modify existing food information including nutritional data and basic properties.

    Authorization: Group Creator or Member permissions required

    This endpoint supports partial updates, modifying only the provided fields while preserving others.
    All fields in the request are optional, enabling targeted updates to specific aspects of food information.

    Key validation features:
    - Nutritional percentage validation ensures totals don't exceed 100% (with 5% tolerance)
    - Data integrity checks maintain consistency across all nutritional information
    - Unit specifications validation for serving calculation accuracy
    - Brand and product name length validation

    Body: (all fields optional)
    - brand: Updated brand name (1-100 characters)
    - product_name: Updated product name (1-100 characters)
    - food_type: Updated food type (wet_food, dry_food)
    - target_pet: Updated target pet species
    - unit_weight_g: Updated unit weight in grams (0.1-5000g)
    - calories_per_100g: Updated calorie content (0-1000 kcal/100g)
    - protein_percentage: Updated protein percentage (0-100%)
    - fat_percentage: Updated fat percentage (0-100%)
    - moisture_percentage: Updated moisture percentage (0-100%)
    - carbohydrate_percentage: Updated carbohydrate percentage (0-100%)

    Returns:
    - Updated complete food details
    - Recalculated convenience fields
    - Validation confirmations for nutritional accuracy
    """
    try:
        food_details = await food_service.update_food(food_id, request, current_user.id)
        return {
            "status": 1,
            "data": food_details.model_dump(),
            "message": f"Food '{food_details.brand} - {food_details.product_name}' updated successfully",
        }
    except Exception as e:
        raise e


@router.post("/{food_id}/delete", response_model=dict)
async def delete_food(food_id: str, current_user: Annotated[UserInfo, Depends(get_current_user)]) -> dict:
    """
    Removes a food item from the group database through soft deletion.

    Authorization: Group Creator or Member permissions required

    This endpoint implements soft deletion to preserve historical feeding records that reference this food.
    The food is marked as inactive and removed from active group database listings while maintaining
    data integrity for historical analysis and reporting.

    Key behaviors:
    - Soft deletion preserves referential integrity with feeding records
    - Food becomes unavailable for new feeding entries
    - Historical feeding records remain intact for analysis
    - Group food database listings exclude deleted foods
    - Associated photos are preserved but become inaccessible through normal flows

    The operation:
    - Marks food as inactive in the database
    - Updates modification timestamp for audit tracking
    - Removes food from active group food database views
    - Preserves all historical data for reporting purposes

    Returns:
    - Success confirmation with food identification
    - Confirmation that historical data is preserved
    """
    try:
        result = await food_service.delete_food(food_id, current_user.id)
        return {"status": 1, "data": result, "message": "Food deleted successfully"}
    except Exception as e:
        raise e


# ================== Group Food Database Management ==================


@router.post("/create", response_model=dict)
async def create_food(
    request: CreateFoodRequest,
    current_user: Annotated[UserInfo, Depends(get_current_user)],
    group_id: str = Query(..., description="Group ID to add food to"),
) -> dict:
    """
    Adds a new food item to the specified group's food database with complete nutritional information.

    Authorization: Group Creator or Member permissions required

    This endpoint enables collaborative food database management where group members can collectively
    build and maintain a shared database of pet foods with detailed nutritional information.

    The food creation process:
    - Validates user permissions within the target group (Creator or Member role required)
    - Accepts comprehensive food information including brand, nutritional data, and unit specifications
    - Validates nutritional percentages to ensure they don't exceed 100% (with 5% tolerance for measurement variations)
    - Generates unique food ID and associates the food with the specified group
    - Returns created food information with calculated convenience fields

    Body:
    - brand: Manufacturer or brand name (1-100 characters, required)
    - product_name: Specific product designation (1-100 characters, required)
    - food_type: Classification as wet_food or dry_food (required)
    - target_pet: Intended pet species (dog, cat, bird, fish, rabbit, other, required)
    - unit_weight_g: Standard serving size in grams (0.1-5000g, required)
    - calories_per_100g: Energy content (0-1000 kcal/100g, required)
    - protein_percentage: Protein content (0-100%, required)
    - fat_percentage: Fat content (0-100%, required)
    - moisture_percentage: Water content (0-100%, required)
    - carbohydrate_percentage: Carbohydrate content (0-100%, required)

    Validation rules:
    - Total nutritional percentages cannot exceed 105% (allowing 5% tolerance)
    - All percentages must be non-negative
    - Unit weight must be positive and reasonable for pet food portions
    - Brand and product names must be within character limits

    Returns:
    - Created food details with generated ID and group association
    - Calculated convenience fields like calories per unit
    - Group context information for collaborative database management
    """
    try:
        food_details = await food_service.create_food(group_id, request, current_user)
        return {
            "status": 1,
            "data": food_details.model_dump(),
            "message": f"Food '{food_details.brand} - {food_details.product_name}' added to group database",
        }
    except Exception as e:
        raise e


@router.get("/list", response_model=dict)
async def get_food_list(
    current_user: Annotated[UserInfo, Depends(get_current_user)],
    group_id: str = Query(..., description="Group ID to get foods from"),
    food_type: Optional[FoodType] = Query(None, description="Filter by food type"),
    target_pet: Optional[TargetPet] = Query(None, description="Filter by target pet species"),
) -> dict:
    """
    Retrieves the complete list of foods available in the specified group's database.

    Authorization: Group membership required (any role: creator, member, or viewer)

    This endpoint provides access to the group's collaborative food database, enabling all group
    members to view available foods for feeding record purposes. The response includes essential
    information for food selection interfaces and supports filtering for better organization.

    Key features:
    - Returns all active foods in the group's database with essential information
    - Supports optional filtering by food type (wet_food, dry_food) and target pet species
    - Includes nutritional summaries for quick comparison and selection
    - Provides photo availability indicators for visual food identification
    - Optimized for quick loading and responsive food selection interfaces

    Query Parameters:
    - food_type (optional): Filter results by food preparation type
    - target_pet (optional): Filter results by intended pet species

    The response structure:
    - Foods sorted alphabetically by brand and product name for easy browsing
    - Essential nutritional information (calories, protein, fat) for quick comparison
    - Photo availability status to indicate visual identification support
    - Group context information for collaborative database management

    Filtering capabilities:
    - Food type filtering enables separation between wet and dry food categories
    - Target pet filtering helps users find foods appropriate for their pet species
    - Multiple filters can be combined for refined results
    - No filters returns complete group food database

    Returns:
    - List of foods with essential information for selection interfaces
    - Photo availability indicators for visual identification
    - Nutritional summaries for quick comparison during food selection
    - Group context for collaborative food database management
    """
    try:
        foods = await food_service.get_group_foods(group_id, current_user.id, food_type, target_pet)
        return {
            "status": 1,
            "data": [food.model_dump() for food in foods],
            "message": f"Found {len(foods)} foods in group database",
        }
    except Exception as e:
        raise e


# ================== Food Search and Discovery ==================


@router.get("/info", response_model=dict)
async def search_foods(
    current_user: Annotated[UserInfo, Depends(get_current_user)],
    group_id: str = Query(..., description="Group ID to search foods in"),
    keyword: str = Query(..., description="Search term to match against food names and brands"),
    food_type: Optional[FoodType] = Query(None, description="Filter by food type"),
    target_pet: Optional[TargetPet] = Query(None, description="Filter by target pet species"),
) -> dict:
    """
    Enables users to search for foods within the group database using text-based queries.

    Authorization: Group membership required (any role: creator, member, or viewer)

    This endpoint performs comprehensive text search across food names and brand names within
    the group's database, supporting case-insensitive partial matching for flexible search results.

    Search functionality:
    - Case-insensitive partial matching across brand and product names
    - Results sorted by relevance (brand matches prioritized over product matches)
    - Additional filtering by food type and target pet when specified
    - Optimized for responsive search-as-you-type functionality
    - Supports empty keyword for browsing with filters

    Query Parameters:
    - keyword (required): Search term to match against food names and brands
    - food_type (optional): Filter results by food type (wet_food, dry_food)
    - target_pet (optional): Filter results by target pet species

    The search algorithm:
    - Searches both brand names and product names simultaneously
    - Prioritizes exact brand matches, then exact product matches
    - Falls back to partial matches for flexible discovery
    - Maintains alphabetical ordering within relevance groups

    Returns:
    - Relevant foods with highlighted or scored relevance for better user experience
    - Essential food information for selection interfaces
    - Photo availability indicators for visual identification
    - Group context for collaborative food database management
    """
    try:
        search_results = await food_service.search_foods(group_id, current_user.id, keyword, food_type, target_pet)
        return {
            "status": 1,
            "data": [result.model_dump() for result in search_results],
            "message": f"Found {len(search_results)} foods matching '{keyword}'",
        }
    except Exception as e:
        raise e


# ================== Photo Management ==================


@router.post("/{food_id}/photo", response_model=dict)
async def upload_food_photo(
    food_id: str,
    current_user: Annotated[UserInfo, Depends(get_current_user)],
    file: UploadFile = File(..., description="Food identification image file"),
) -> dict:
    """
    Allows users to upload or update a single identifying photo for a food item.

    Authorization: Group Creator or Member permissions required

    This endpoint enables visual identification of food products within the group database,
    supporting collaborative food management where multiple people need to identify the same products.

    File Requirements:
    - Image files only (JPEG, PNG, GIF, WebP)
    - Maximum size: 5MB (smaller than pet photos for storage efficiency)
    - Single photo per food (replaces existing if present)
    - Recommended resolution: 800x600 or higher for clear identification

    The system:
    - Stores photos securely in local backend storage using food ID as filename
    - Replaces existing photos automatically (one photo per food limitation)
    - Validates file format and size for security and performance
    - Updates food record with photo availability status
    - Provides immediate photo access for food identification

    Storage approach:
    - Files saved with food_id as filename for simplified management
    - Original filename preserved in metadata for user reference
    - Photo metadata stored for access control and cleanup procedures
    - Local storage enables future cloud migration when needed

    Returns:
    - Photo information including file metadata
    - Upload confirmation with file size and format details
    - Uploader information for audit and collaboration tracking
    """
    try:
        photo_info = await food_service.upload_food_photo(food_id, file, current_user.id)
        return {"status": 1, "data": photo_info.model_dump(), "message": "Food photo uploaded successfully"}
    except Exception as e:
        raise e


@router.get("/photos/{food_id}", response_class=FileResponse)
async def get_food_photo(food_id: str, current_user: Annotated[UserInfo, Depends(get_current_user)]):
    """
    Serves food identification photos to authorized users through secure access control.

    Authorization: Group membership required (any role through food access validation)

    This endpoint provides secure access to food identification photos, ensuring that only
    users with appropriate group membership can access food images from the collaborative database.

    Security features:
    - Validates user permission to access the specific food through group membership
    - Prevents unauthorized photo access across different groups
    - Returns appropriate error responses for non-existent or inaccessible photos
    - Maintains privacy by enforcing group-based access control

    Performance optimizations:
    - Includes HTTP caching headers for browser optimization (1 hour cache)
    - Serves files directly from local storage for minimal latency
    - Proper MIME type detection for browser compatibility
    - Efficient file serving without loading into memory

    Response characteristics:
    - Direct image file response with appropriate content headers
    - Cache-Control headers for performance optimization
    - Proper content-type headers for browser display
    - Filename preservation for download scenarios
    """
    try:
        return await food_service.get_food_photo(food_id, current_user.id)
    except Exception as e:
        raise e


@router.post("/{food_id}/photo/delete", response_model=dict)
async def delete_food_photo(food_id: str, current_user: Annotated[UserInfo, Depends(get_current_user)]) -> dict:
    """
    Removes the photo associated with a food item, clearing the visual identification.

    Authorization: Group Creator or Member permissions required

    This endpoint provides clean removal of food identification photos while maintaining
    system cleanliness and storage optimization. The operation handles both the physical
    file removal and database record cleanup.

    The operation performs:
    - Physical file deletion from storage system to prevent storage bloat
    - Database record removal to clear photo availability status
    - Food record update to reflect photo removal
    - Graceful handling of cases where no photo exists

    Cleanup procedures:
    - Validates user permission to modify the food through group membership
    - Removes photo file from local storage system
    - Updates food record to clear photo availability indicators
    - Cleans up associated metadata and references

    Error handling:
    - Gracefully handles cases where no photo exists without throwing errors
    - Validates permissions before attempting any removal operations
    - Maintains system integrity even if file cleanup encounters issues

    System maintenance:
    - Prevents storage bloat by removing unused files
    - Maintains database consistency by cleaning up orphaned records
    - Supports storage cleanup and maintenance procedures

    Returns:
    - Success confirmation with food context information
    - Handles non-existent photo scenarios gracefully
    - Provides clear feedback for successful photo removal
    """
    try:
        result = await food_service.delete_food_photo(food_id, current_user.id)
        return {"status": 1, "data": result, "message": "Photo deleted successfully"}
    except Exception as e:
        raise e
