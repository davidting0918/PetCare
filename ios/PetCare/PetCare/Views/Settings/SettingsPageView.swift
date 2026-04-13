import SwiftUI
import PhotosUI

struct SettingsPageView: View {
    var authViewModel: AuthViewModel
    var dataStore: DataStore
    @State private var showCreatePet = false
    @State private var showCreateGroup = false
    @State private var showJoinGroup = false
    @State private var editingPet: PetInfo?

    var body: some View {
        NavigationStack {
            ZStack {
                Color.surface0.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 16) {
                        HeaderView(title: "Settings", dataStore: dataStore)

                        if let user = authViewModel.user {
                            UserProfileCard(user: user)
                        }

                        MyPetsSection(pets: dataStore.pets, onCreatePet: { showCreatePet = true }, onEditPet: { editingPet = $0 })

                        GroupsSection(dataStore: dataStore, onCreateGroup: { showCreateGroup = true }, onJoinGroup: { showJoinGroup = true })

                        VStack(spacing: 12) {
                            Button { authViewModel.logout() } label: {
                                HStack {
                                    Image(systemName: "rectangle.portrait.and.arrow.right")
                                    Text("Sign Out")
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(Color.danger.opacity(0.15))
                                .foregroundStyle(Color.danger)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                            }
                        }
                        .padding(.horizontal)
                        .padding(.bottom, 40)
                    }
                }
            }
            .navigationBarHidden(true)
            .sheet(isPresented: $showCreatePet) {
                CreatePetSheet(dataStore: dataStore)
                    .presentationDetents([.medium, .large])
                    .presentationDragIndicator(.visible)
            }
            .sheet(item: $editingPet) { pet in
                EditPetSheet(dataStore: dataStore, pet: pet)
                    .presentationDetents([.medium, .large])
                    .presentationDragIndicator(.visible)
            }
            .sheet(isPresented: $showCreateGroup) {
                CreateGroupSheet(dataStore: dataStore)
                    .presentationDetents([.medium])
                    .presentationDragIndicator(.visible)
            }
            .sheet(isPresented: $showJoinGroup) {
                JoinGroupSheet(dataStore: dataStore)
                    .presentationDetents([.medium, .large])
                    .presentationDragIndicator(.visible)
            }
        }
    }
}

// MARK: - User Profile

struct UserProfileCard: View {
    let user: User

    var body: some View {
        HStack(spacing: 16) {
            if let pic = user.picture, let url = URL(string: pic) {
                AsyncImage(url: url) { image in
                    image.resizable().scaledToFill()
                } placeholder: { ProgressView() }
                .frame(width: 56, height: 56).clipShape(Circle())
            } else {
                Image(systemName: "person.circle.fill")
                    .font(.system(size: 48)).foregroundStyle(Color.accentTeal)
            }
            VStack(alignment: .leading, spacing: 4) {
                Text(user.name)
                    .font(.headline).foregroundStyle(Color.textPrimary)
                Text(user.email)
                    .font(.subheadline).foregroundStyle(Color.textSecondary)
            }
            Spacer()
        }
        .padding()
        .background(Color.surface1)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal)
    }
}

// MARK: - My Pets

struct MyPetsSection: View {
    let pets: [PetInfo]
    var onCreatePet: () -> Void
    var onEditPet: (PetInfo) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("My Pets")
                    .font(.headline).foregroundStyle(Color.textPrimary)
                Spacer()
                Button { onCreatePet() } label: {
                    Image(systemName: "plus.circle.fill").foregroundStyle(Color.accentPink)
                }
            }
            .padding(.horizontal)

            ForEach(pets) { pet in
                Button { onEditPet(pet) } label: {
                    HStack(spacing: 12) {
                        if let url = pet.photoUrl, let imageURL = URL(string: url) {
                            AsyncImage(url: imageURL) { image in
                                image.resizable().scaledToFill()
                            } placeholder: {
                                Image(systemName: "pawprint.fill").foregroundStyle(Color.accentTeal)
                            }
                            .frame(width: 44, height: 44).clipShape(Circle())
                        } else {
                            Image(systemName: "pawprint.fill")
                                .foregroundStyle(Color.accentTeal)
                                .frame(width: 44, height: 44)
                        }
                        VStack(alignment: .leading, spacing: 2) {
                            Text(pet.name).font(.subheadline).fontWeight(.medium).foregroundStyle(Color.textPrimary)
                            HStack(spacing: 4) {
                                if let breed = pet.breed { Text(breed).font(.caption).foregroundStyle(Color.textSecondary) }
                                if let gn = pet.groupName {
                                    Text(gn).font(.caption2).padding(.horizontal, 6).padding(.vertical, 1)
                                        .background(Color.accentBlue.opacity(0.15)).foregroundStyle(Color.accentBlue)
                                        .clipShape(RoundedRectangle(cornerRadius: 4))
                                }
                            }
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.caption).foregroundStyle(Color.textTertiary)
                    }
                }
                .padding()
                .background(Color.surface1)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .padding(.horizontal)
            }
        }
    }
}

// MARK: - Create Pet Sheet

struct CreatePetSheet: View {
    var dataStore: DataStore
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var petType: PetType = .dog
    @State private var gender: PetGender = .unknown
    @State private var breed = ""
    @State private var birthDate = Date()
    @State private var hasBirthDate = false
    @State private var currentWeightStr = ""
    @State private var targetWeightStr = ""
    @State private var heightStr = ""
    @State private var isSpayed = false
    @State private var microchipId = ""
    @State private var calorieTargetStr = ""
    @State private var notes = ""
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var selectedPhotoData: Data?
    @State private var isSaving = false

    var body: some View {
        NavigationStack {
            Form {
                // Photo
                Section {
                    HStack {
                        Spacer()
                        if let photoData = selectedPhotoData, let uiImage = UIImage(data: photoData) {
                            Image(uiImage: uiImage)
                                .resizable().scaledToFill()
                                .frame(width: 80, height: 80).clipShape(Circle())
                        } else {
                            Image(systemName: "pawprint.circle.fill")
                                .font(.system(size: 64)).foregroundStyle(Color.accentTeal)
                        }
                        Spacer()
                    }
                    PhotosPicker(selection: $selectedPhotoItem, matching: .images) {
                        Text("Add Photo")
                            .frame(maxWidth: .infinity)
                            .foregroundStyle(Color.accentPink)
                    }
                }

                Section("Basic Info") {
                    LabeledContent("Name *") { TextField("Required", text: $name).multilineTextAlignment(.trailing) }
                    Picker("Type", selection: $petType) {
                        ForEach(PetType.allCases, id: \.self) { Text($0.rawValue.capitalized) }
                    }
                    Picker("Gender", selection: $gender) {
                        ForEach(PetGender.allCases, id: \.self) { Text($0.rawValue.capitalized) }
                    }
                    LabeledContent("Breed") { TextField("Optional", text: $breed).multilineTextAlignment(.trailing) }
                    Toggle("Set Birth Date", isOn: $hasBirthDate)
                    if hasBirthDate {
                        DatePicker("Birth Date", selection: $birthDate, displayedComponents: .date)
                    }
                }

                Section("Health") {
                    LabeledContent("Weight (kg)") { TextField("0.0", text: $currentWeightStr).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }
                    LabeledContent("Target (kg)") { TextField("0.0", text: $targetWeightStr).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }
                    LabeledContent("Height (cm)") { TextField("0.0", text: $heightStr).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }
                    LabeledContent("Cal/Day") { TextField("0", text: $calorieTargetStr).keyboardType(.numberPad).multilineTextAlignment(.trailing) }
                    Toggle("Spayed / Neutered", isOn: $isSpayed)
                }

                Section("Other") {
                    LabeledContent("Microchip ID") { TextField("Optional", text: $microchipId).multilineTextAlignment(.trailing) }
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Notes").font(.subheadline).foregroundStyle(Color.textSecondary)
                        TextEditor(text: $notes)
                            .frame(minHeight: 60)
                    }
                }
            }
            .navigationTitle("New Pet").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isSaving ? "Saving..." : "Save") { save() }
                        .disabled(name.isEmpty || isSaving)
                }
            }
            .onChange(of: selectedPhotoItem) { _, item in
                Task {
                    if let data = try? await item?.loadTransferable(type: Data.self) {
                        selectedPhotoData = data
                    }
                }
            }
        }
    }

    private func save() {
        isSaving = true
        Task {
            let birthTimestamp: Int? = hasBirthDate ? Int(birthDate.timeIntervalSince1970) : nil
            let req = CreatePetRequest(
                name: name, petType: petType,
                breed: breed.isEmpty ? nil : breed,
                gender: gender,
                birthDate: birthTimestamp,
                currentWeightKg: Double(currentWeightStr),
                targetWeightKg: Double(targetWeightStr),
                heightCm: Double(heightStr),
                isSpayed: isSpayed,
                microchipId: microchipId.isEmpty ? nil : microchipId,
                dailyCalorieTarget: Int(calorieTargetStr),
                notes: notes.isEmpty ? nil : notes
            )
            do {
                let newPet = try await APIClient.shared.createPet(req)
                // Upload photo if selected
                if let photoData = selectedPhotoData {
                    _ = try? await APIClient.shared.uploadPetPhoto(petId: newPet.id, data: photoData, filename: "pet_photo.jpg")
                }
            } catch {
                #if DEBUG
                print("Create pet failed: \(error)")
                #endif
            }
            await dataStore.refreshPets()
            dismiss()
        }
    }
}

// MARK: - Edit Pet Sheet

struct EditPetSheet: View {
    var dataStore: DataStore
    let pet: PetInfo
    @Environment(\.dismiss) private var dismiss
    @State private var name: String
    @State private var breed: String
    @State private var gender: PetGender
    @State private var targetWeightStr: String
    @State private var heightStr: String
    @State private var isSpayed: Bool
    @State private var microchipId: String
    @State private var calorieTargetStr: String
    @State private var notes: String
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var selectedPhotoData: Data?
    @State private var isSaving = false

    init(dataStore: DataStore, pet: PetInfo) {
        self.dataStore = dataStore
        self.pet = pet
        _name = State(initialValue: pet.name)
        _breed = State(initialValue: pet.breed ?? "")
        _gender = State(initialValue: pet.gender ?? .unknown)
        _targetWeightStr = State(initialValue: pet.targetWeightKg.map { String(format: "%.1f", $0) } ?? "")
        _heightStr = State(initialValue: "")
        _isSpayed = State(initialValue: false)
        _microchipId = State(initialValue: "")
        _calorieTargetStr = State(initialValue: pet.dailyCalorieTarget.map { "\($0)" } ?? "")
        _notes = State(initialValue: "")
    }

    var body: some View {
        NavigationStack {
            Form {
                // Photo section
                Section {
                    HStack {
                        Spacer()
                        if let photoData = selectedPhotoData, let uiImage = UIImage(data: photoData) {
                            Image(uiImage: uiImage)
                                .resizable().scaledToFill()
                                .frame(width: 80, height: 80).clipShape(Circle())
                        } else if let url = pet.photoUrl, let imageURL = URL(string: url) {
                            AsyncImage(url: imageURL) { image in
                                image.resizable().scaledToFill()
                            } placeholder: { ProgressView() }
                            .frame(width: 80, height: 80).clipShape(Circle())
                        } else {
                            Image(systemName: "pawprint.circle.fill")
                                .font(.system(size: 64)).foregroundStyle(Color.accentTeal)
                        }
                        Spacer()
                    }
                    PhotosPicker(selection: $selectedPhotoItem, matching: .images) {
                        Text("Change Photo")
                            .frame(maxWidth: .infinity)
                            .foregroundStyle(Color.accentPink)
                    }
                }

                Section("Basic Info") {
                    LabeledContent("Name") { TextField("Name", text: $name).multilineTextAlignment(.trailing) }
                    LabeledContent("Breed") { TextField("Breed", text: $breed).multilineTextAlignment(.trailing) }
                    Picker("Gender", selection: $gender) {
                        ForEach(PetGender.allCases, id: \.self) { Text($0.rawValue.capitalized) }
                    }
                }

                Section("Health") {
                    LabeledContent("Current Weight") {
                        Text(pet.currentWeightKg.map { String(format: "%.1f kg", $0) } ?? "—")
                            .foregroundStyle(Color.textTertiary)
                    }
                    LabeledContent("Target (kg)") { TextField("0.0", text: $targetWeightStr).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }
                    LabeledContent("Height (cm)") { TextField("0.0", text: $heightStr).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }
                    LabeledContent("Cal/Day") { TextField("0", text: $calorieTargetStr).keyboardType(.numberPad).multilineTextAlignment(.trailing) }
                    Toggle("Spayed / Neutered", isOn: $isSpayed)
                }

                Section("Other") {
                    LabeledContent("Microchip ID") { TextField("Optional", text: $microchipId).multilineTextAlignment(.trailing) }
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Notes").font(.subheadline).foregroundStyle(Color.textSecondary)
                        TextEditor(text: $notes)
                            .frame(minHeight: 60)
                    }
                }
            }
            .navigationTitle("Edit \(pet.name)").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { save() }
                        .disabled(name.isEmpty || isSaving)
                }
            }
            .onChange(of: selectedPhotoItem) { _, item in
                Task {
                    if let data = try? await item?.loadTransferable(type: Data.self) {
                        selectedPhotoData = data
                    }
                }
            }
        }
    }

    private func save() {
        isSaving = true
        Task {
            // Upload photo first if changed
            if let photoData = selectedPhotoData {
                _ = try? await APIClient.shared.uploadPetPhoto(petId: pet.id, data: photoData, filename: "pet_photo.jpg")
            }

            let req = UpdatePetRequest(
                name: name,
                breed: breed.isEmpty ? nil : breed,
                gender: gender,
                targetWeightKg: Double(targetWeightStr),
                heightCm: Double(heightStr),
                isSpayed: isSpayed,
                microchipId: microchipId.isEmpty ? nil : microchipId,
                dailyCalorieTarget: Int(calorieTargetStr),
                notes: notes.isEmpty ? nil : notes
            )
            _ = try? await APIClient.shared.updatePet(petId: pet.id, req)
            await dataStore.refreshPets()
            if let petId = dataStore.currentPetId {
                await dataStore.refreshPetDetails(petId: petId)
            }
            dismiss()
        }
    }
}

// MARK: - Create Group Sheet

struct CreateGroupSheet: View {
    var dataStore: DataStore
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""

    var body: some View {
        NavigationStack {
            Form { Section("Group Name") { TextField("Name", text: $name) } }
                .scrollContentBackground(.hidden)
                .background(Color.surface0)
            .navigationTitle("New Group").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task {
                            _ = try? await APIClient.shared.createGroup(CreateGroupRequest(name: name))
                            await dataStore.refreshGroups()
                            dismiss()
                        }
                    }
                    .disabled(name.isEmpty)
                }
            }
        }
    }
}

// MARK: - Join Group Sheet

struct JoinGroupSheet: View {
    var dataStore: DataStore
    @Environment(\.dismiss) private var dismiss
    @State private var inviteCode = ""
    @State private var preview: InvitationPreview?
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Invite Code") {
                    TextField("Enter code", text: $inviteCode)
                }
                if let p = preview {
                    Section("Preview") {
                        Text("Group: \(p.groupName)")
                        Text("Invited by: \(p.inviterName)")
                        Text("Role: \(p.role)")
                        Button("Join Group") {
                            Task {
                                _ = try? await APIClient.shared.joinGroup(inviteCode: inviteCode)
                                await dataStore.refreshGroups()
                                dismiss()
                            }
                        }
                        .foregroundStyle(Color.accentTeal)
                    }
                }
                if let error = errorMessage {
                    Section { Text(error).foregroundStyle(Color.danger) }
                }
            }
            .scrollContentBackground(.hidden)
            .background(Color.surface0)
            .navigationTitle("Join Group").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Look Up") {
                        Task {
                            do { preview = try await APIClient.shared.previewInvitation(inviteCode: inviteCode) }
                            catch { errorMessage = error.localizedDescription }
                        }
                    }
                    .disabled(inviteCode.isEmpty)
                }
            }
        }
    }
}
