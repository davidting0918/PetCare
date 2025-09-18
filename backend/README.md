# PetCare API Documentation

<div align="center">

**Professional Pet Health Tracker API Reference**

[![API Version](https://img.shields.io/badge/API-v1.0.0-blue.svg?style=for-the-badge)](https://api.petcare.com)
[![Status](https://img.shields.io/badge/Status-Active-success.svg?style=for-the-badge)](https://api.petcare.com/health)
[![Documentation](https://img.shields.io/badge/Docs-Interactive-orange.svg?style=for-the-badge)](https://api.petcare.com/docs)

</div>

## 📋 Table of Contents

- [Overview](#-overview)
- [API Endpoints](#-api-endpoints)
  - [Authentication Endpoints](#authentication-endpoints)
  - [User Management Endpoints](#user-management-endpoints)
  - [Pet Management Endpoints](#pet-management-endpoints)
  - [Group Management Endpoints](#group-management-endpoints)
  - [Food Database Endpoints](#food-database-endpoints)
  - [Meal Tracking Endpoints](#meal-tracking-endpoints)
- [Request/Response Format](#-requestresponse-format)
- [Authentication Methods](#-authentication-methods)
- [Error Codes](#-error-codes)
- [Rate Limits](#-rate-limits)

---

## 🎯 Overview

The PetCare API is a comprehensive RESTful API designed for pet health tracking and collaborative care management. It enables families and care teams to track pet health, feeding schedules, and nutritional intake with detailed analytics and reporting capabilities.

### Base URLs
- **Production**: `https://api.petcare.com`
- **Development**: `http://localhost:8000`

### Core Features
- **Multi-Provider Authentication**: Supports both email/password and Google OAuth 2.0 authentication
- **Individual Pet Ownership**: Each pet belongs to a specific user who maintains full control
- **Group Collaboration**: Pets can be assigned to groups for shared care responsibilities  
- **Role-Based Access Control**: Granular permissions (Creator, Member, Viewer) for different collaboration levels
- **Comprehensive Food Database**: Collaborative nutritional database with detailed food information
- **Automated Nutritional Calculations**: Precise calorie and nutrient tracking based on serving sizes
- **File Management**: Secure photo upload and serving for pets and foods
- **Analytics**: Comprehensive feeding statistics and health trend analysis

## 📋 API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/email/login` | Authenticates users with email and password credentials |
| `POST` | `/auth/google/login` | Authenticates users using Google OAuth 2.0 authorization code |
| `POST` | `/auth/access_token` | Generates access token using OAuth2PasswordRequestForm format |

#### Email Login
**Purpose**: Validates user credentials and returns access token with user information for standard email/password authentication.

**Request Example**:
```http
POST /auth/email/login
Content-Type: application/json

{
    "email": "john.doe@example.com",
    "pwd": "secure_password123"
}
```

**Response Example**:
```json
{
    "status": 1,
    "data": {
        "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
        "token_type": "bearer",
        "user": {
            "id": "user_456",
            "email": "john.doe@example.com",
            "name": "John Doe"
        }
    },
    "message": "Email login successful"
}
```

**Implementation**: Performs user authentication by validating email and password credentials against the database. Upon successful validation, the endpoint generates and returns a JWT access token for subsequent API access, accompanied by essential user profile information for client application initialization.

#### Google OAuth Login  
**Purpose**: Processes Google OAuth authorization code and creates or authenticates existing users for seamless social login integration.

**Request Example**:
```http
POST /auth/google/login
Content-Type: application/json

{
    "code": "4/0AdQt8qh7rMz9XYZ...",
    "redirect_uri": "http://localhost:3000/auth/callback"
}
```

**Response Example**:
```json
{
    "status": 1,
    "data": {
        "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
        "token_type": "bearer",
        "user": {
            "id": "user_789",
            "email": "john.doe@gmail.com",
            "name": "John Doe",
            "picture": "https://lh3.googleusercontent.com/a/photo.jpg"
        }
    },
    "message": "Google login successful"
}
```

**Implementation**: Processes Google OAuth 2.0 authorization flow by exchanging the provided authorization code for user credentials. The system automatically creates new user accounts for first-time Google users or authenticates existing users, then issues a JWT access token with Google-sourced profile information.

#### Access Token Generation
**Purpose**: OAuth2-compatible token endpoint for generating access tokens using username/password format.

**Request Example**:
```http
POST /auth/access_token
Content-Type: application/x-www-form-urlencoded

grant_type=password&username=john.doe@example.com&password=secure_password123
```

**Response Example**:
```json
{
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "token_type": "bearer",
    "message": "Access token generated successfully"
}
```

**Implementation**: Provides OAuth2-compliant access token generation following the standard OAuth2PasswordRequestForm specification. This endpoint facilitates integration with OAuth2 client libraries and third-party applications requiring standardized token acquisition endpoints.

---

### User Management Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/user/create` | Creates new user account with email verification |
| `GET` | `/user/me` | Retrieves current authenticated user's profile information |
| `POST` | `/user/update` | Updates user profile information |
| `POST` | `/user/reset_password` | Changes user password with validation |

#### Create User Account
**Purpose**: Registers new users in the system with email validation and secure password hashing.

**Request Example**:
```http
POST /user/create
Content-Type: application/json
X-API-Key: your_api_key_here

{
    "email": "jane.smith@example.com",
    "name": "Jane Smith",
    "pwd": "SecurePassword456!"
}
```

**Response Example**:
```json
{
    "status": 1,
    "data": {
        "id": "user_123",
        "email": "jane.smith@example.com",
        "name": "Jane Smith",
        "picture": "",
        "personal_group_id": "group_456",
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-15T10:30:00Z",
        "source": "email",
        "is_active": true,
        "is_verified": true
    },
    "message": "User registered successfully"
}
```

**Implementation**: Executes user account creation with comprehensive validation and security measures. The system validates email format uniqueness, applies bcrypt hashing to password credentials, and automatically provisions a personal group for individual pet management. API key authentication ensures controlled access to the registration process.

#### Get Current User Profile
**Purpose**: Retrieves comprehensive profile information for the authenticated user.

**Request Example**:
```http
GET /user/me
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**Response Example**:
```json
{
    "status": 1,
    "data": {
        "id": "user_456",
        "email": "john.doe@example.com",
        "name": "John Doe",
        "picture": "https://profile-pic-url.com/pic.jpg",
        "personal_group_id": "group_789",
        "created_at": "2024-01-10T08:15:00Z",
        "updated_at": "2024-01-15T14:22:00Z",
        "source": "email",
        "is_active": true,
        "is_verified": true
    },
    "message": "Welcome, John Doe!"
}
```

**Implementation**: Retrieves complete authenticated user profile data from the database, providing comprehensive account information including personal group association, account status, and metadata. This endpoint serves as the primary source for user context initialization in client applications.

#### Update User Information
**Purpose**: Allows users to modify their profile information including name and picture.

**Request Example**:
```http
POST /user/update
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{
    "name": "John Updated Doe",
    "picture": "https://new-profile-pic.com/updated.jpg"
}
```

**Response Example**:
```json
{
    "status": 1,
    "data": {
        "id": "user_456",
        "email": "john.doe@example.com",
        "name": "John Updated Doe",
        "picture": "https://new-profile-pic.com/updated.jpg",
        "personal_group_id": "group_789",
        "created_at": "2024-01-10T08:15:00Z",
        "updated_at": "2024-01-20T16:45:00Z",
        "source": "email",
        "is_active": true,
        "is_verified": true
    },
    "message": "User info updated successfully"
}
```

**Implementation**: Facilitates partial or complete profile information updates through selective field modification. The system validates input data, updates specified fields while preserving unchanged attributes, and automatically refreshes modification timestamps for audit trail maintenance.

#### Reset Password
**Purpose**: Enables secure password changes with old password verification.

**Request Example**:
```http
POST /user/reset_password
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{
    "old_pwd": "CurrentPassword123!",
    "new_pwd": "NewSecurePassword789!"
}
```

**Response Example**:
```json
{
    "status": 1,
    "data": {
        "id": "user_456",
        "email": "john.doe@example.com",
        "name": "John Doe",
        "picture": "https://profile-pic-url.com/pic.jpg",
        "personal_group_id": "group_789",
        "created_at": "2024-01-10T08:15:00Z",
        "updated_at": "2024-01-20T17:00:00Z",
        "source": "email",
        "is_active": true,
        "is_verified": true
    },
    "message": "Password reset successfully"
}
```

**Implementation**: Executes secure password modification through multi-step verification process. The system validates current password credentials against stored hash, applies bcrypt hashing to the new password, and updates the user record while maintaining security protocols throughout the transaction.

### Pet Management Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/pets/create` | Creates a new pet profile owned by the authenticated user |
| `GET` | `/pets/accessible` | Retrieves all pets the current user can access across groups |
| `GET` | `/pets/{pet_id}/details` | Returns comprehensive information about a specific pet |
| `POST` | `/pets/{pet_id}/update` | Updates pet information (owner permission required) |
| `POST` | `/pets/{pet_id}/delete` | Soft deletes a pet (owner permission required) |
| `POST` | `/pets/{pet_id}/assign_group` | Assigns pet to a different group |
| `GET` | `/pets/{pet_id}/current_group` | Retrieves pet's current group assignment information |
| `POST` | `/pets/{pet_id}/photo/upload` | Uploads or replaces pet photo |
| `GET` | `/pets/photos/{pet_id}` | Serves pet photos with permission-controlled access |

#### Create Pet
**Purpose**: Creates a new pet profile with comprehensive health and care information.

**Request Example**:
```http
POST /pets/create
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{
    "name": "Fluffy",
    "pet_type": "cat",
    "breed": "Persian",
    "gender": "female",
    "birth_date": "2022-06-15T00:00:00Z",
    "current_weight_kg": 4.5,
    "target_weight_kg": 4.2,
    "height_cm": 25.0,
    "is_spayed": true,
    "microchip_id": "123456789012345",
    "daily_calorie_target": 300,
    "notes": "Very playful, likes to climb high places"
}
```

**Response Example**:
```json
{
    "status": 1,
    "data": {
        "id": "pet_789",
        "name": "Fluffy",
        "pet_type": "cat",
        "breed": "Persian",
        "gender": "female",
        "birth_date": "2022-06-15T00:00:00Z",
        "current_weight_kg": 4.5,
        "target_weight_kg": 4.2,
        "height_cm": 25.0,
        "is_spayed": true,
        "microchip_id": "123456789012345",
        "daily_calorie_target": 300,
        "owner_id": "user_456",
        "group_id": null,
        "created_at": "2024-01-20T10:30:00Z",
        "updated_at": "2024-01-20T10:30:00Z",
        "is_active": true,
        "photo_url": "",
        "notes": "Very playful, likes to climb high places"
    },
    "message": "Pet 'Fluffy' created successfully"
}
```

**Implementation**: Constructs comprehensive pet profile records with full ownership attribution to the authenticated user. The system processes extensive pet metadata including biological characteristics, health indicators, and care specifications, initializing the pet in an unassigned state for subsequent group allocation and collaborative care management.

#### Get Accessible Pets
**Purpose**: Retrieves all pets the user can access, including owned pets and group-shared pets.

**Request Example**:
```http
GET /pets/accessible
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**Response Example**:
```json
{
    "status": 1,
    "data": [
        {
            "id": "pet_789",
            "name": "Fluffy",
            "pet_type": "cat",
            "breed": "Persian",
            "gender": "female",
            "current_weight_kg": 4.5,
            "owner_id": "user_456",
            "owner_name": "John Doe",
            "group_id": "group_123",
            "group_name": "Doe Family",
            "user_permission": "owner",
            "created_at": "2024-01-20T10:30:00Z",
            "updated_at": "2024-01-20T10:30:00Z",
            "is_active": true
        },
        {
            "id": "pet_456",
            "name": "Max",
            "pet_type": "dog",
            "breed": "Golden Retriever",
            "gender": "male",
            "current_weight_kg": 28.5,
            "owner_id": "user_123",
            "owner_name": "Jane Smith",
            "group_id": "group_123",
            "group_name": "Doe Family",
            "user_permission": "member",
            "created_at": "2024-01-15T14:20:00Z",
            "updated_at": "2024-01-18T16:45:00Z",
            "is_active": true
        }
    ],
    "message": "Found 2 accessible pets"
}
```

**Implementation**: Aggregates pet data from multiple authorization contexts, including direct ownership and group-based access permissions. The system evaluates user permissions across all relevant groups and returns pet records with contextual permission indicators ("owner", "creator", "member", "viewer") that define operational scope for each pet.

#### Get Pet Details
**Purpose**: Provides comprehensive pet profile including health data and care preferences.
**Authentication**: Bearer token required (pet access permission required)
**Request Body**: None  
**Response**: Complete pet profile with calculated fields like age from birth date
**Use Case**: Pet profile pages, detailed health tracking, care planning
**Permission Adaptive**: Response content adapts based on user's permission level
**Data Includes**: Physical characteristics, health information, care preferences, photo availability

#### Update Pet Information
**Purpose**: Allows pet owners to modify pet information with partial update support.
**Authentication**: Bearer token required (pet ownership required)
**Request Body**: Any combination of updatable pet fields (all optional)
**Response**: Updated complete pet details
**Use Case**: Pet profile maintenance, health record updates, care preference changes
**Validation**: Same validation rules as pet creation for provided fields
**Flexibility**: Supports partial updates, modifying only provided fields

#### Delete Pet
**Purpose**: Performs soft deletion to preserve historical data while removing from active use.
**Authentication**: Bearer token required (pet ownership required)
**Request Body**: None
**Response**: Deletion confirmation with pet identification
**Use Case**: Removing pets from active management while preserving feeding history
**Soft Deletion**: Pet marked inactive, removed from group, hidden from active lists
**Data Preservation**: Historical feeding and health records maintained for reporting

#### Assign Pet to Group
**Purpose**: Moves pet from current assignment to different group for collaborative care.
**Authentication**: Bearer token required (pet ownership AND target group creator permission)
**Request Body**: Target group ID
**Response**: Updated group assignment information with group details
**Use Case**: Sharing pets with family members, transferring to care teams
**Atomic Operation**: Removes from current group and assigns to new group in single transaction
**Validation**: Target group must exist, user must have creator access to target group

#### Get Pet Current Group
**Purpose**: Provides information about pet's current group assignment and user's role context.
**Authentication**: Bearer token required (pet access permission required)
**Request Body**: None
**Response**: Group assignment details, user role, member context, assignment timing
**Use Case**: Understanding collaboration context, determining available actions
**Context Information**: Group member count, user's permission level, assignment history
**Null Handling**: Returns null values if pet not assigned to any group

#### Upload Pet Photo
**Purpose**: Uploads or replaces pet photo for visual identification with security validation.

**Request Example**:
```http
POST /pets/pet_789/photo/upload
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: multipart/form-data

--boundary
Content-Disposition: form-data; name="file"; filename="fluffy_photo.jpg"
Content-Type: image/jpeg

[binary image data]
--boundary--
```

**Response Example**:
```json
{
    "status": 1,
    "data": {
        "photo_id": "photo_456",
        "pet_id": "pet_789",
        "filename": "fluffy_photo.jpg",
        "file_size": 1024000,
        "content_type": "image/jpeg",
        "uploaded_by": "user_456",
        "uploaded_at": "2024-01-20T15:30:00Z"
    },
    "message": "Photo uploaded successfully for pet"
}
```

**Implementation**: Processes multipart file uploads with comprehensive validation including file type verification, size constraints, and format compliance. The system generates unique identifiers, implements secure storage protocols, and automatically replaces existing pet photos while maintaining access control metadata and audit trails.

#### Get Pet Photo
**Purpose**: Serves pet photos with permission-controlled access and browser optimization.

**Request Example**:
```http
GET /pets/photos/pet_789
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**Response Example**:
```
HTTP/1.1 200 OK
Content-Type: image/jpeg
Content-Length: 1024000
Cache-Control: public, max-age=3600
Last-Modified: Sat, 20 Jan 2024 15:30:00 GMT

[binary image data]
```

**Implementation**: Delivers binary image content through permission-validated access control mechanisms. The system verifies user authorization via ownership or group membership validation, then streams optimized image data with appropriate HTTP caching headers and MIME type detection for enhanced client performance.

### Group Management Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/groups/create` | Creates a new group for family pet care collaboration |
| `POST` | `/groups/{group_id}/invite` | Generates invitation code for joining the group |
| `POST` | `/groups/join` | Joins a group using invitation code |
| `GET` | `/groups/my_groups` | Retrieves all groups where user is a member |
| `GET` | `/groups/{group_id}/members` | Lists all members of a specific group |
| `POST` | `/groups/{group_id}/update_role` | Updates member roles (creator permission required) |
| `POST` | `/groups/{group_id}/remove` | Removes member from group (creator permission required) |
| `GET` | `/groups/{group_id}/pets` | Retrieves all pets assigned to the group |

#### Create Group
**Purpose**: Establishes new collaboration group with the creator automatically becoming a member.

**Request Example**:
```http
POST /groups/create
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{
    "name": "Smith Family Pets"
}
```

**Response Example**:
```json
{
    "status": 1,
    "data": {
        "id": "group_456",
        "name": "Smith Family Pets",
        "creator_id": "user_789",
        "creator_name": "John Smith",
        "created_at": "2024-01-20T11:00:00Z",
        "updated_at": "2024-01-20T11:00:00Z",
        "is_active": true,
        "member_count": 1,
        "user_role": "creator"
    },
    "message": "Group created successfully"
}
```

**Implementation**: Establishes collaborative group entities with automatic creator role assignment and administrative privilege allocation. The system initializes group infrastructure, establishes membership hierarchies, and provisions the foundational structure for subsequent pet care coordination and team collaboration workflows.

#### Create Group Invitation
**Purpose**: Generates time-limited invitation codes for secure group joining.

**Request Example**:
```http
POST /groups/group_456/invite
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**Response Example**:
```json
{
    "status": 1,
    "data": {
        "invite_code": "ABC123XYZ",
        "group_id": "group_456",
        "group_name": "Smith Family Pets",
        "expires_at": "2024-01-27T11:00:00Z",
        "created_by": "user_789",
        "created_at": "2024-01-20T11:05:00Z"
    },
    "message": "Invitation created successfully"
}
```

**Implementation**: Generates cryptographically secure invitation tokens with time-based expiration constraints. The system creates unique access codes with 7-day validity periods, enabling controlled group expansion while maintaining security protocols through automated expiration and single-use validation mechanisms.

#### Join Group
**Purpose**: Allows users to join existing groups using valid invitation codes.

**Request Example**:
```http
POST /groups/join
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{
    "invite_code": "ABC123XYZ"
}
```

**Response Example**:
```json
{
    "status": 1,
    "data": {
        "group_id": "group_456",
        "group_name": "Smith Family Pets",
        "creator_name": "John Smith",
        "member_count": 2,
        "user_role": "member",
        "joined_at": "2024-01-20T14:30:00Z"
    },
    "message": "Successfully joined group"
}
```

**Implementation**: Processes invitation code validation and executes user integration into existing group structures. The system verifies code authenticity, expiration status, and duplicate membership constraints before establishing user membership with appropriate permission levels and collaborative access rights.

#### Get User Groups
**Purpose**: Lists all groups where the current user has any level of membership.
**Authentication**: Bearer token required
**Request Body**: None
**Response**: List of groups with user's role in each group
**Use Case**: Group selection interfaces, navigation menus, dashboard displays
**Role Information**: Includes user's specific role (creator, member, viewer) in each group
**Basic Information**: Group names, creation dates, and membership context

#### Get Group Members
**Purpose**: Provides complete member list with roles for group management interfaces.
**Authentication**: Bearer token required (group membership required)
**Request Body**: None
**Response**: List of all group members with their roles and user information
**Use Case**: Member management interfaces, role assignment, group administration
**Member Details**: User names, emails, roles, and join dates
**Permission Context**: Only group members can view member lists

#### Update Member Role
**Purpose**: Allows group creators to modify member roles for permission management.
**Authentication**: Bearer token required (group creator permission required)
**Request Body**: Target user ID and new role (member, viewer)
**Response**: Updated role assignment confirmation
**Use Case**: Managing group permissions, adjusting member access levels
**Restrictions**: Cannot assign creator role (only one creator per group), cannot change creator's role
**Available Roles**: Can assign "member" (full access) or "viewer" (read-only) roles

#### Remove Group Member
**Purpose**: Enables group creators to remove members from group collaboration.
**Authentication**: Bearer token required (group creator permission required)
**Request Body**: Target user ID to remove
**Response**: Member removal confirmation
**Use Case**: Managing group membership, removing inactive or unauthorized members
**Restrictions**: Cannot remove the group creator, only creators can remove members
**Clean Removal**: Member access to group pets and data immediately revoked

#### Get Group Pets
**Purpose**: Lists all pets currently assigned to the specified group for collaborative care.
**Authentication**: Bearer token required (group membership required)
**Request Body**: None
**Response**: List of pets with owner information and user's permission level for each
**Use Case**: Group pet dashboards, collaborative care interfaces, assignment overviews
**Permission Context**: Shows user's specific permission level ("owner", "creator", "member", "viewer") for each pet
**Pet Details**: Essential pet information needed for group collaboration and care coordination

### Food Database Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/foods/create` | Adds new food item to group's collaborative database |
| `GET` | `/foods/list` | Retrieves all foods available in specified group |
| `GET` | `/foods/info` | Searches for foods within group using text queries |
| `GET` | `/foods/{food_id}/details` | Returns comprehensive food information and nutritional data |
| `POST` | `/foods/{food_id}/update` | Updates existing food information |
| `POST` | `/foods/{food_id}/delete` | Soft deletes food item from group database |
| `POST` | `/foods/{food_id}/photo` | Uploads or replaces food identification photo |
| `GET` | `/foods/photos/{food_id}` | Serves food photos with access control |
| `POST` | `/foods/{food_id}/photo/delete` | Removes food identification photo |

#### Create Food Entry
**Purpose**: Adds new food items to group's collaborative database with complete nutritional information.

**Request Example**:
```http
POST /foods/create?group_id=group_456
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{
    "brand": "Royal Canin",
    "product_name": "Persian Adult Cat Food",
    "food_type": "dry_food",
    "target_pet": "cat",
    "unit_weight_g": 10.0,
    "calories_per_100g": 380,
    "protein_percentage": 30.0,
    "fat_percentage": 18.0,
    "moisture_percentage": 8.0,
    "carbohydrate_percentage": 44.0
}
```

**Response Example**:
```json
{
    "status": 1,
    "data": {
        "id": "food_123",
        "brand": "Royal Canin",
        "product_name": "Persian Adult Cat Food",
        "food_type": "dry_food",
        "target_pet": "cat",
        "unit_weight_g": 10.0,
        "calories_per_100g": 380,
        "calories_per_unit": 38.0,
        "protein_percentage": 30.0,
        "fat_percentage": 18.0,
        "moisture_percentage": 8.0,
        "carbohydrate_percentage": 44.0,
        "group_id": "group_456",
        "created_at": "2024-01-20T16:00:00Z",
        "updated_at": "2024-01-20T16:00:00Z",
        "is_active": true,
        "has_photo": false
    },
    "message": "Food 'Royal Canin - Persian Adult Cat Food' added to group database"
}
```

**Implementation**: Processes comprehensive food data integration into group-specific collaborative databases. The system validates complete nutritional profiles, enforces percentage constraints with tolerance allowances, automatically derives calculated fields (calories per unit), and maintains data integrity through validation protocols and relational consistency checks.

#### List Group Foods
**Purpose**: Retrieves complete food database for specified group with optional filtering capabilities.

**Request Example**:
```http
GET /foods/list?group_id=group_456&food_type=dry_food&target_pet=cat
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**Response Example**:
```json
{
    "status": 1,
    "data": [
        {
            "id": "food_123",
            "brand": "Royal Canin",
            "product_name": "Persian Adult Cat Food",
            "food_type": "dry_food",
            "target_pet": "cat",
            "unit_weight_g": 10.0,
            "calories_per_100g": 380,
            "calories_per_unit": 38.0,
            "protein_percentage": 30.0,
            "fat_percentage": 18.0,
            "has_photo": false,
            "group_id": "group_456"
        },
        {
            "id": "food_456",
            "brand": "Hill's",
            "product_name": "Science Diet Adult Cat",
            "food_type": "dry_food",
            "target_pet": "cat",
            "unit_weight_g": 8.5,
            "calories_per_100g": 365,
            "calories_per_unit": 31.0,
            "protein_percentage": 28.0,
            "fat_percentage": 16.5,
            "has_photo": true,
            "group_id": "group_456"
        }
    ],
    "message": "Found 2 foods in group database"
}
```

**Implementation**: Retrieves comprehensive food inventory from group-specific databases with advanced filtering mechanisms. The system processes query parameters for food type and target species classification, applies filtering logic, and returns structured nutritional data with photo availability indicators and calculated nutritional derivatives for feeding interface optimization.

#### Search Foods  
**Purpose**: Performs comprehensive text search across food names and brands within group database.
**Authentication**: Bearer token required (Group membership required - any role)
**Request Body**: None
**Response**: Relevant foods ranked by search relevance
**Use Case**: Finding specific foods during feeding, search-as-you-type functionality
**Query Parameters**: Required keyword, optional food_type and target_pet filters
**Search Algorithm**: Case-insensitive partial matching, prioritizes brand matches over product matches
**Performance**: Optimized for responsive search interfaces

#### Get Food Details
**Purpose**: Provides complete food profile including all nutritional data and specifications.
**Authentication**: Bearer token required (Group membership required - any role)
**Request Body**: None
**Response**: Comprehensive food information with calculated fields and group context
**Use Case**: Detailed food information displays, nutritional analysis, feeding calculations
**Data Includes**: Complete nutritional breakdown, unit specifications, photo availability, group association
**Calculated Fields**: Calories per unit for serving size calculations

---

### Meal Tracking Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/meals` | Records new feeding session with automatic nutritional calculations |
| `GET` | `/meals` | Retrieves feeding records with comprehensive filtering options |
| `GET` | `/meals/{meal_id}/details` | Returns detailed information about specific meal record |
| `POST` | `/meals/{meal_id}/update` | Updates existing meal record with recalculation |
| `POST` | `/meals/{meal_id}/delete` | Soft deletes meal record while preserving statistics |
| `GET` | `/meals/today` | Provides current day's feeding summary and progress |
| `GET` | `/meals/summary` | Generates comprehensive feeding statistics and analytics |

#### Record Meal
**Purpose**: Captures complete feeding information with automatic nutritional calculations based on food database.

**Request Example**:
```http
POST /meals
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{
    "pet_id": "pet_789",
    "food_id": "food_123",
    "fed_at": "2024-01-20T08:30:00Z",
    "meal_type": "breakfast",
    "serving_type": "units",
    "serving_amount": 50,
    "notes": "Ate everything quickly, seemed very hungry"
}
```

**Response Example**:
```json
{
    "status": 1,
    "data": {
        "id": "meal_456",
        "pet_id": "pet_789",
        "pet_name": "Fluffy",
        "food_id": "food_123",
        "food_brand": "Royal Canin",
        "food_product_name": "Persian Adult Cat Food",
        "fed_at": "2024-01-20T08:30:00Z",
        "meal_type": "breakfast",
        "serving_type": "units",
        "serving_amount": 50,
        "actual_weight_g": 500.0,
        "calories": 190.0,
        "protein_g": 150.0,
        "fat_g": 90.0,
        "carbohydrate_g": 220.0,
        "fed_by": "user_456",
        "fed_by_name": "John Doe",
        "notes": "Ate everything quickly, seemed very hungry",
        "group_id": "group_456",
        "created_at": "2024-01-20T08:30:00Z"
    },
    "message": "Meal recorded for Fluffy successfully"
}
```

**Implementation**: Processes comprehensive feeding event documentation with automated nutritional computation algorithms. The system interprets serving measurements (unit-based or weight-based), performs real-time calculations for actual consumption weight, caloric intake, and macronutrient distribution based on food database profiles, enabling precise nutritional tracking and feeding pattern analysis.

#### Get Meal Records  
**Purpose**: Retrieves feeding records with extensive filtering for various analysis scenarios.
**Authentication**: Bearer token required (appropriate access based on query scope)
**Request Body**: None
**Response**: List of meal records with feeding information, pet context, and pagination
**Use Case**: Feeding history review, care coordination, health trend analysis
**Query Parameters**: pet_id, group_id, date ranges, meal types, feeders, pagination controls
**Permission Requirements**: Pet-level or group-level access depending on query scope
**Flexible Queries**: Supports both individual pet and group-wide feeding analysis

#### Get Meal Details
**Purpose**: Provides comprehensive information about specific feeding record including full context.
**Authentication**: Bearer token required (group membership for meal's associated group)
**Request Body**: None
**Response**: Complete meal details with pet info, food details, nutritional breakdown, and feeding context
**Use Case**: Meal record review, feeding accuracy verification, detailed nutritional analysis
**Comprehensive Data**: Pet information, food details with brand/product, serving calculations, feeder attribution
**Audit Trail**: Complete feeding context with timestamps and user information

#### Update Meal Record
**Purpose**: Allows correction of feeding records with automatic nutritional recalculation.
**Authentication**: Bearer token required (original recorder or group Creator permissions)
**Request Body**: Any combination of updatable meal fields (all optional for partial updates)
**Response**: Updated complete meal details with recalculated nutritional values
**Use Case**: Correcting feeding records, adjusting serving amounts, updating meal classifications
**Permission Rules**: Creators can modify any group record, members can only modify own records
**Automatic Recalculation**: Food or serving changes trigger complete nutritional recalculation
**Data Integrity**: Validates food access and maintains referential integrity

#### Delete Meal Record
**Purpose**: Removes incorrect or duplicate feeding records through soft deletion.
**Authentication**: Bearer token required (original recorder or group Creator permissions)
**Request Body**: None
**Response**: Deletion confirmation
**Use Case**: Removing incorrect entries, duplicate record cleanup, feeding record management
**Soft Deletion**: Preserves data for historical analysis while removing from active queries
**Permission Rules**: Same as update operations - creators or original recorders only
**Statistics Preservation**: Historical data maintained for reporting and trend analysis

#### Get Today's Meals
**Purpose**: Provides real-time daily feeding status and progress tracking for coordination.

**Request Example**:
```http
GET /meals/today?pet_id=pet_789
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**Response Example**:
```json
{
    "status": 1,
    "data": {
        "date": "2024-01-20",
        "pet_id": "pet_789",
        "pet_name": "Fluffy",
        "daily_calorie_target": 300,
        "total_calories_consumed": 285,
        "target_achievement_percentage": 95.0,
        "meals_count": 3,
        "meal_type_breakdown": {
            "breakfast": 1,
            "lunch": 1,
            "dinner": 1,
            "snack": 0
        },
        "meals": [
            {
                "id": "meal_456",
                "fed_at": "2024-01-20T08:30:00Z",
                "meal_type": "breakfast",
                "food_name": "Royal Canin Persian Adult",
                "calories": 95,
                "fed_by_name": "John Doe"
            },
            {
                "id": "meal_789",
                "fed_at": "2024-01-20T13:15:00Z",
                "meal_type": "lunch",
                "food_name": "Royal Canin Persian Adult",
                "calories": 95,
                "fed_by_name": "Jane Doe"
            },
            {
                "id": "meal_123",
                "fed_at": "2024-01-20T18:00:00Z",
                "meal_type": "dinner",
                "food_name": "Royal Canin Persian Adult",
                "calories": 95,
                "fed_by_name": "John Doe"
            }
        ]
    },
    "message": "Today's meal summary retrieved for 2024-01-20"
}
```

**Implementation**: Generates real-time daily feeding analytics with comprehensive nutritional progress assessment. The system aggregates current-day feeding events, calculates target achievement metrics, analyzes meal distribution patterns, and constructs chronological feeding timelines to facilitate collaborative care coordination and daily nutritional monitoring workflows.

#### Get Meal Statistics
**Purpose**: Generates comprehensive statistical analysis of feeding patterns over specified periods.
**Authentication**: Bearer token required (appropriate access based on query parameters)
**Request Body**: None
**Response**: Detailed feeding statistics with trends, averages, and pattern analysis
**Use Case**: Health assessment, feeding pattern analysis, nutritional goal evaluation
**Required Parameters**: Date range (date_from, date_to), either pet_id or group_id
**Statistical Analysis**: Daily averages, nutritional breakdowns, feeding patterns, goal achievement metrics
**Flexible Periods**: Supports any date range with accurate daily average calculations
**Comprehensive Metrics**: Total consumption, feeding frequency, nutrition analysis, feeder activity patterns

---

## 📋 Request/Response Format

### Standard Response Structure
All API endpoints return responses in the following consistent format:

```json
{
  "status": 1,              // 1 = success, 0 = error  
  "data": {...},            // Response data (varies by endpoint)
  "message": "string"       // Human-readable message
}
```

### Request Headers
- **Content-Type**: `application/json` for JSON requests, `multipart/form-data` for file uploads
- **Authorization**: `Bearer {token}` for authenticated endpoints
- **X-API-Key**: `{api_key}` for endpoints requiring API key authentication

### Common Request Body Fields
- **Timestamps**: ISO 8601 format (e.g., `2024-01-20T08:30:00Z`)
- **IDs**: String format for all entity identifiers
- **Enums**: Predefined string values (case-sensitive)
- **File Uploads**: Multipart form data with `file` field

---

## 🔐 Authentication Methods

### JWT Bearer Token Authentication
Most endpoints require JWT bearer token authentication:
- **Header**: `Authorization: Bearer {token}`
- **Token Lifespan**: Configurable expiration (typically 1-24 hours)
- **Scope**: Full API access for authenticated user
- **Usage**: Include in Authorization header for all protected endpoints

### API Key Authentication  
User registration endpoint requires API key:
- **Header**: `X-API-Key: {api_key}`
- **Purpose**: Protects user creation endpoint
- **Scope**: Limited to user registration functionality
- **Acquisition**: Contact development team for API key

### Google OAuth 2.0 Flow
1. **Client Redirect**: Redirect user to Google OAuth consent screen
2. **Authorization Code**: Google returns authorization code to callback URL  
3. **Token Exchange**: Send authorization code to `/auth/google/login`
4. **JWT Response**: Receive JWT token and user profile information

### Token Refresh
- **Automatic Refresh**: Tokens automatically refresh on successful API calls
- **Expiration Handling**: Implement token expiration detection and re-authentication
- **Storage**: Store tokens securely (avoid localStorage for sensitive applications)

## 🚨 Error Codes

### HTTP Status Codes
| Status | Description | Common Causes |
|--------|-------------|---------------|
| `200` | Success | Request completed successfully |
| `400` | Bad Request | Invalid request format or missing required fields |
| `401` | Unauthorized | Missing, invalid, or expired authentication token |
| `403` | Forbidden | Insufficient permissions for requested resource |
| `404` | Not Found | Requested resource does not exist |
| `422` | Unprocessable Entity | Request format valid but contains semantic errors |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Unexpected server error |

### Error Response Format
```json
{
  "status": 0,
  "data": null,
  "message": "Detailed error description",
  "details": {
    "error_type": "validation_error",
    "field_errors": ["field1", "field2"]
  }
}
```

### Common Error Scenarios

#### Authentication Errors
- **Invalid Token**: Token expired, malformed, or not provided
- **Insufficient Permissions**: User lacks required role for operation
- **API Key Missing**: Required X-API-Key header not provided for user creation

#### Validation Errors  
- **Field Validation**: Input values outside acceptable ranges
- **Required Fields**: Missing required request body fields
- **Format Errors**: Invalid data formats (emails, timestamps, etc.)

#### Resource Errors
- **Not Found**: Requested pet, group, food, or meal does not exist
- **Access Denied**: User cannot access resource due to permission restrictions
- **Duplicate Data**: Attempting to create duplicate resources

#### Business Logic Errors
- **Pet Assignment**: Trying to assign pet to group without proper permissions  
- **Food Validation**: Nutritional percentages exceeding 100% total
- **Group Operations**: Invalid role assignments or member management operations

---

## ⚡ Rate Limits

### Request Limits
| Endpoint Category | Limit | Time Window | Scope |
|------------------|-------|-------------|-------|
| Authentication | 10 requests | per minute | per IP address |
| General API calls | 1000 requests | per hour | per authenticated user |
| Photo uploads | 50 uploads | per hour | per authenticated user |
| Search requests | 200 requests | per hour | per authenticated user |
| User registration | 5 requests | per hour | per IP address |

### Rate Limit Headers
The API includes rate limit information in response headers:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window  
- `X-RateLimit-Reset`: Unix timestamp when limit resets

### Rate Limit Exceeded Response
```json
{
  "status": 0,
  "data": null,
  "message": "Rate limit exceeded",
  "details": {
    "retry_after": 3600,
    "limit": 1000,
    "window": "1 hour"
  }
}
```

### Best Practices
- **Implement Exponential Backoff**: Gradually increase delay between retries
- **Cache Responses**: Store frequently requested data to reduce API calls
- **Monitor Headers**: Track rate limit headers to avoid hitting limits
- **Batch Operations**: Combine multiple operations when possible

---

## 📚 Interactive Documentation

### Swagger UI
**URL**: `https://api.petcare.com/docs` (or `http://localhost:8000/docs` for local development)

**Features**:
- Complete endpoint documentation with request/response schemas
- Interactive API testing directly from browser
- Authentication support with token input
- Real-time parameter validation
- Example request/response bodies

### Scalar UI  
**URL**: `https://api.petcare.com/scalar` (or `http://localhost:8000/scalar` for local development)

**Features**:
- Modern, clean API documentation interface  
- Enhanced readability with organized endpoint groupings
- Code generation examples in multiple languages
- Comprehensive schema documentation
- Advanced filtering and search capabilities

### Development Tools
- **OpenAPI Specification**: Complete OpenAPI 3.0 schema available at `/openapi.json`
- **Health Check**: API status endpoint at `/` for monitoring
- **Static File Access**: Pet and food photos served from `/static/` endpoints

---

## 🎯 Summary

The PetCare API provides a comprehensive solution for pet health tracking and collaborative care management. Key capabilities include:

### Core Functionality
- **Multi-Provider Authentication** with email/password and Google OAuth 2.0
- **Individual Pet Ownership** with flexible group assignment for collaboration
- **Role-Based Access Control** supporting Creator, Member, and Viewer permissions
- **Collaborative Food Database** with nutritional information and search capabilities
- **Automated Meal Tracking** with precise nutritional calculations
- **Comprehensive Analytics** for feeding patterns and health trend analysis

### Technical Features
- **RESTful Design** with consistent response formats
- **Secure File Management** for pet and food photos
- **Soft Deletion** preserving historical data for reporting
- **Real-Time Updates** for daily feeding status and progress tracking
- **Flexible Filtering** supporting complex queries across all endpoints
- **Rate Limiting** and security controls for production use

### Use Cases
- **Family Pet Management**: Collaborative care within households
- **Professional Care Teams**: Veterinary clinics and pet care services  
- **Health Tracking**: Long-term pet health monitoring and analysis
- **Nutritional Management**: Precise feeding and dietary control
- **Care Coordination**: Multi-user collaboration with role-based permissions

For detailed endpoint specifications, request/response formats, and interactive testing, visit the [Swagger Documentation](https://api.petcare.com/docs).

---

<div align="center">

**Professional Pet Care API - Built for Collaboration**

Need assistance? Contact our development team or explore the interactive documentation.

</div>
