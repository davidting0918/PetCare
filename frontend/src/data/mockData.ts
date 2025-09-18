import type {
  User,
  Pet,
  PetAccess,
  Food,
  MealEntry,
  WeightEntry,
  Medicine,
  MedicineSchedule,
  MedicineLog,
  Activity,
  FamilyMember,
  DailySummary
} from '../types';

// Mock Users
export const mockUsers: User[] = [
  {
    id: 'user1',
    email: 'john.doe@example.com',
    name: 'John Doe',
    avatar: 'https://via.placeholder.com/150x150?text=JD',
    googleId: 'google123'
  },
  {
    id: 'user2',
    email: 'jane.doe@example.com',
    name: 'Jane Doe',
    avatar: 'https://via.placeholder.com/150x150?text=JD',
    googleId: 'google456'
  }
];

// Mock Pets
export const mockPets: Pet[] = [
  {
    id: 'pet1',
    name: 'Buddy',
    breed: 'Golden Retriever',
    age: 3,
    weight: 28.5,
    targetWeight: 27.0,
    photo: 'https://via.placeholder.com/200x200?text=Buddy',
    dailyCalorieGoal: 1200,
    ownerId: 'user1'
  },
  {
    id: 'pet2',
    name: 'Whiskers',
    breed: 'British Shorthair',
    age: 2,
    weight: 4.2,
    targetWeight: 4.0,
    photo: 'https://via.placeholder.com/200x200?text=Whiskers',
    dailyCalorieGoal: 300,
    ownerId: 'user1'
  },
  {
    id: 'pet3',
    name: 'Max',
    breed: 'German Shepherd',
    age: 5,
    weight: 32.0,
    photo: 'https://via.placeholder.com/200x200?text=Max',
    dailyCalorieGoal: 1400,
    ownerId: 'user2'
  }
];

// Mock Pet Access (showing permissions)
export const mockPetAccess: PetAccess[] = [
  {
    petId: 'pet1',
    userId: 'user1',
    role: 'Creator',
    pet: mockPets[0]
  },
  {
    petId: 'pet2',
    userId: 'user1',
    role: 'Creator',
    pet: mockPets[1]
  },
  {
    petId: 'pet3',
    userId: 'user1',
    role: 'Member',
    pet: mockPets[2]
  }
];

// Mock Family Members
export const mockFamilyMembers: FamilyMember[] = [
  {
    id: 'family1',
    name: 'Mom',
    role: 'Adult'
  },
  {
    id: 'family2',
    name: 'Dad',
    role: 'Adult'
  },
  {
    id: 'family3',
    name: 'Kids',
    role: 'Child'
  }
];

// Mock Foods
export const mockFoods: Food[] = [
  {
    id: 'food1',
    name: 'Premium Dry Dog Food',
    caloriesPerUnit: 350,
    unit: 'cup',
    photo: 'https://via.placeholder.com/150x150?text=Dry+Food',
    category: 'dry-food',
    isFavorite: true
  },
  {
    id: 'food2',
    name: 'Chicken & Rice Wet Food',
    caloriesPerUnit: 120,
    unit: 'can',
    photo: 'https://via.placeholder.com/150x150?text=Wet+Food',
    category: 'wet-food',
    isFavorite: true
  },
  {
    id: 'food3',
    name: 'Training Treats',
    caloriesPerUnit: 5,
    unit: 'piece',
    photo: 'https://via.placeholder.com/150x150?text=Treats',
    category: 'treat',
    isFavorite: false
  },
  {
    id: 'food4',
    name: 'Cat Kibble Premium',
    caloriesPerUnit: 380,
    unit: 'cup',
    photo: 'https://via.placeholder.com/150x150?text=Cat+Food',
    category: 'dry-food',
    isFavorite: true
  },
  {
    id: 'food5',
    name: 'Dental Chew Sticks',
    caloriesPerUnit: 25,
    unit: 'piece',
    photo: 'https://via.placeholder.com/150x150?text=Dental',
    category: 'treat',
    isFavorite: false
  }
];

// Mock Meal Entries (last 7 days)
const generateMealEntries = (): MealEntry[] => {
  const entries: MealEntry[] = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Breakfast for Buddy
    entries.push({
      id: `meal-${i}-1`,
      petId: 'pet1',
      foodId: 'food1',
      amount: 1,
      calories: 350,
      mealType: 'breakfast',
      timestamp: new Date(date.setHours(8, 0, 0, 0)),
      loggedBy: 'family1',
      food: mockFoods[0]
    });

    // Dinner for Buddy
    entries.push({
      id: `meal-${i}-2`,
      petId: 'pet1',
      foodId: 'food2',
      amount: 1,
      calories: 120,
      mealType: 'dinner',
      timestamp: new Date(date.setHours(18, 0, 0, 0)),
      loggedBy: 'family2',
      food: mockFoods[1]
    });

    // Cat food for Whiskers
    if (i < 3) {
      entries.push({
        id: `meal-${i}-3`,
        petId: 'pet2',
        foodId: 'food4',
        amount: 0.5,
        calories: 190,
        mealType: 'breakfast',
        timestamp: new Date(date.setHours(7, 30, 0, 0)),
        loggedBy: 'family1',
        food: mockFoods[3]
      });
    }
  }

  return entries;
};

export const mockMealEntries = generateMealEntries();

// Mock Weight Entries (last 30 days)
const generateWeightEntries = (): WeightEntry[] => {
  const entries: WeightEntry[] = [];
  const today = new Date();

  for (let i = 0; i < 30; i += 3) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    entries.push({
      id: `weight-${i}`,
      petId: 'pet1',
      weight: 28.5 + (Math.random() - 0.5) * 0.8, // Random variation
      date: date,
      loggedBy: 'family1'
    });
  }

  return entries.reverse(); // Order from oldest to newest
};

export const mockWeightEntries = generateWeightEntries();

// Mock Medicines
export const mockMedicines: Medicine[] = [
  {
    id: 'med1',
    name: 'Heartworm Prevention',
    dosage: '1 tablet',
    frequency: 'daily',
    timeOfDay: ['08:00'],
    startDate: new Date('2024-01-01'),
    instructions: 'Give with food'
  },
  {
    id: 'med2',
    name: 'Joint Supplement',
    dosage: '2 capsules',
    frequency: 'twice-daily',
    timeOfDay: ['08:00', '20:00'],
    startDate: new Date('2024-01-15'),
    instructions: 'Can be given with or without food'
  },
  {
    id: 'med3',
    name: 'Flea Prevention',
    dosage: '1 application',
    frequency: 'weekly',
    timeOfDay: ['10:00'],
    startDate: new Date('2024-02-01'),
    endDate: new Date('2024-05-01'),
    instructions: 'Apply to back of neck'
  }
];

// Mock Medicine Schedules
export const mockMedicineSchedules: MedicineSchedule[] = [
  {
    id: 'sched1',
    petId: 'pet1',
    medicineId: 'med1',
    medicine: mockMedicines[0],
    isActive: true
  },
  {
    id: 'sched2',
    petId: 'pet1',
    medicineId: 'med2',
    medicine: mockMedicines[1],
    isActive: true
  },
  {
    id: 'sched3',
    petId: 'pet2',
    medicineId: 'med3',
    medicine: mockMedicines[2],
    isActive: false
  }
];

// Mock Medicine Logs (today)
export const mockMedicineLogs: MedicineLog[] = [
  {
    id: 'log1',
    petId: 'pet1',
    medicineId: 'med1',
    scheduledTime: new Date(new Date().setHours(8, 0, 0, 0)),
    actualTime: new Date(new Date().setHours(8, 15, 0, 0)),
    isGiven: true,
    givenBy: 'family1',
    medicine: mockMedicines[0]
  },
  {
    id: 'log2',
    petId: 'pet1',
    medicineId: 'med2',
    scheduledTime: new Date(new Date().setHours(8, 0, 0, 0)),
    isGiven: false,
    medicine: mockMedicines[1]
  },
  {
    id: 'log3',
    petId: 'pet1',
    medicineId: 'med2',
    scheduledTime: new Date(new Date().setHours(20, 0, 0, 0)),
    isGiven: false,
    medicine: mockMedicines[1]
  }
];

// Mock Activities (recent)
export const mockActivities: Activity[] = [
  {
    id: 'act1',
    petId: 'pet1',
    type: 'meal',
    description: 'Fed breakfast (Premium Dry Dog Food, 1 cup)',
    timestamp: new Date(new Date().setHours(8, 0, 0, 0)),
    performedBy: 'family1'
  },
  {
    id: 'act2',
    petId: 'pet1',
    type: 'medicine',
    description: 'Gave Heartworm Prevention',
    timestamp: new Date(new Date().setHours(8, 15, 0, 0)),
    performedBy: 'family1'
  },
  {
    id: 'act3',
    petId: 'pet1',
    type: 'weight',
    description: 'Recorded weight: 28.3 kg',
    timestamp: new Date(new Date().setHours(7, 30, 0, 0)),
    performedBy: 'family2'
  }
];

// Mock Daily Summary
export const mockDailySummary: DailySummary = {
  date: new Date(),
  petId: 'pet1',
  caloriesConsumed: 470,
  caloriesGoal: 1200,
  mealsLogged: 2,
  weight: 28.3,
  medicinesGiven: 1,
  medicinesScheduled: 3
};

// Helper function to get user's accessible pets
export const getUserAccessiblePets = (userId: string): PetAccess[] => {
  return mockPetAccess.filter(access => access.userId === userId);
};

// Helper function to get today's meal entries for a pet
export const getTodayMeals = (petId: string): MealEntry[] => {
  const today = new Date();
  return mockMealEntries.filter(entry =>
    entry.petId === petId &&
    entry.timestamp.toDateString() === today.toDateString()
  );
};

// Helper function to get today's medicine logs for a pet
export const getTodayMedicineLogs = (petId: string): MedicineLog[] => {
  const today = new Date();
  return mockMedicineLogs.filter(log =>
    log.petId === petId &&
    log.scheduledTime.toDateString() === today.toDateString()
  );
};
