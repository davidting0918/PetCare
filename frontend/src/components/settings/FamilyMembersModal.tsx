import React, { useState } from 'react';
import {
  X,
  Users,
  Plus,
  Edit,
  Trash2,
  Crown,
  User,
  Mail,
  Send,
  AlertCircle,
  Check
} from 'lucide-react';
import { mockFamilyMembers, getUserAccessiblePets } from '../../data/mockData';
import { useAuth } from '../../contexts/AuthContext';
import type { FamilyMember } from '../../types';

interface FamilyMembersModalProps {
  onClose: () => void;
}

interface InviteForm {
  email: string;
  role: 'Adult' | 'Child';
  permissions: {
    canAddFood: boolean;
    canLogMeals: boolean;
    canManageWeight: boolean;
    canGiveMedicine: boolean;
    canViewReports: boolean;
  };
}

export const FamilyMembersModal: React.FC<FamilyMembersModalProps> = ({
  onClose
}) => {
  const { user, getUserPets } = useAuth();
  const [activeTab, setActiveTab] = useState<'members' | 'invite' | 'requests'>('members');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteForm>({
    email: '',
    role: 'Adult',
    permissions: {
      canAddFood: true,
      canLogMeals: true,
      canManageWeight: true,
      canGiveMedicine: true,
      canViewReports: true
    }
  });
  const [inviteError, setInviteError] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const userPets = getUserPets();

  // Mock pending invitations
  const pendingInvites = [
    {
      id: '1',
      email: 'sarah.johnson@example.com',
      role: 'Adult' as const,
      sentDate: new Date('2024-01-15'),
      sentBy: user?.name || 'You'
    },
    {
      id: '2',
      email: 'tommy.doe@example.com',
      role: 'Child' as const,
      sentDate: new Date('2024-01-10'),
      sentBy: user?.name || 'You'
    }
  ];

  // Mock access requests
  const accessRequests = [
    {
      id: '1',
      name: 'Alex Wilson',
      email: 'alex.wilson@example.com',
      requestedAt: new Date('2024-01-12'),
      message: 'Hi! I help take care of Buddy when you\'re away. Could I get access to track his meals?'
    }
  ];

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteForm.email.trim()) {
      setInviteError('Email is required');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteForm.email)) {
      setInviteError('Please enter a valid email address');
      return;
    }

    setIsInviting(true);
    setInviteError('');

    try {
      // Simulate API call
      console.log('Sending invite:', inviteForm);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Reset form
      setInviteForm({
        email: '',
        role: 'Adult',
        permissions: {
          canAddFood: true,
          canLogMeals: true,
          canManageWeight: true,
          canGiveMedicine: true,
          canViewReports: true
        }
      });
      setShowInviteForm(false);
    } catch (error) {
      setInviteError('Failed to send invite. Please try again.');
    } finally {
      setIsInviting(false);
    }
  };

  const getMemberStats = (member: FamilyMember) => {
    // Mock statistics for each family member
    const stats = {
      family1: { mealsLogged: 45, weightEntries: 8, medicinesGiven: 23 },
      family2: { mealsLogged: 38, weightEntries: 5, medicinesGiven: 15 },
      family3: { mealsLogged: 12, weightEntries: 1, medicinesGiven: 3 }
    };
    return stats[member.id as keyof typeof stats] || { mealsLogged: 0, weightEntries: 0, medicinesGiven: 0 };
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-primary w-full max-w-md max-h-[90vh] rounded-3xl overflow-hidden shadow-3d flex flex-col">
        {/* Header */}
        <div className="bg-white p-4 shadow-3d flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Family Members</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {[
              { id: 'members', label: 'Members', count: mockFamilyMembers.length },
              { id: 'invite', label: 'Invite', count: null },
              { id: 'requests', label: 'Requests', count: accessRequests.length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-orange shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab.label}
                {tab.count !== null && tab.count > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id ? 'bg-orange/20 text-orange' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Members Tab */}
          {activeTab === 'members' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  {mockFamilyMembers.length} family members managing {userPets.length} pet{userPets.length !== 1 ? 's' : ''}
                </p>
              </div>

              {mockFamilyMembers.map(member => {
                const stats = getMemberStats(member);
                return (
                  <div key={member.id} className="card-3d p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-full bg-mint/20 flex items-center justify-center">
                          {member.avatar ? (
                            <img
                              src={member.avatar}
                              alt={member.name}
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            <User className="w-6 h-6 text-mint" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium text-gray-800">{member.name}</h3>
                            {member.id === 'family1' && (
                              <Crown className="w-4 h-4 text-orange" title="Primary caregiver" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 capitalize">{member.role}</p>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <button className="p-1 text-gray-400 hover:text-gray-600">
                          <Edit className="w-4 h-4" />
                        </button>
                        {member.id !== 'family1' && (
                          <button className="p-1 text-gray-400 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center text-xs">
                      <div>
                        <p className="font-bold text-gray-800">{stats.mealsLogged}</p>
                        <p className="text-gray-500">Meals</p>
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{stats.weightEntries}</p>
                        <p className="text-gray-500">Weight</p>
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{stats.medicinesGiven}</p>
                        <p className="text-gray-500">Medicine</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Invite Tab */}
          {activeTab === 'invite' && (
            <div className="space-y-4">
              {!showInviteForm ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-orange/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-orange" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Invite Family Members</h3>
                  <p className="text-gray-600 mb-6 text-sm">
                    Share pet care responsibilities with family members and friends
                  </p>
                  <button
                    onClick={() => setShowInviteForm(true)}
                    className="btn-3d px-6 py-3 text-white font-medium"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Send Invitation
                  </button>
                </div>
              ) : (
                <form onSubmit={handleInviteSubmit} className="space-y-4">
                  <div className="card-3d p-4">
                    <h3 className="font-medium text-gray-800 mb-3">Send Invitation</h3>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address *
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <input
                            type="email"
                            value={inviteForm.email}
                            onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="family@example.com"
                            className="input-3d pl-10 w-full"
                            required
                          />
                        </div>
                        {inviteError && (
                          <p className="mt-1 text-sm text-red-600 flex items-center">
                            <AlertCircle className="w-4 h-4 mr-1" />
                            {inviteError}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Family Role
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {(['Adult', 'Child'] as const).map(role => (
                            <button
                              key={role}
                              type="button"
                              onClick={() => setInviteForm(prev => ({ ...prev, role }))}
                              className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                                inviteForm.role === role
                                  ? 'btn-3d btn-3d-mint text-gray-700'
                                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                              }`}
                            >
                              {role}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card-3d p-4">
                    <h4 className="font-medium text-gray-800 mb-3">Permissions</h4>
                    <div className="space-y-2">
                      {Object.entries({
                        canLogMeals: 'Log meals and treats',
                        canManageWeight: 'Record weight entries',
                        canGiveMedicine: 'Give medicines and log them',
                        canAddFood: 'Add new food items',
                        canViewReports: 'View health reports'
                      }).map(([key, label]) => (
                        <label key={key} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{label}</span>
                          <input
                            type="checkbox"
                            checked={inviteForm.permissions[key as keyof typeof inviteForm.permissions]}
                            onChange={(e) => setInviteForm(prev => ({
                              ...prev,
                              permissions: {
                                ...prev.permissions,
                                [key]: e.target.checked
                              }
                            }))}
                            className="toggle-checkbox"
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowInviteForm(false)}
                      className="flex-1 btn-3d btn-3d-mint py-3 text-gray-700 font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isInviting}
                      className="flex-1 btn-3d py-3 text-white font-medium disabled:opacity-50"
                    >
                      {isInviting ? (
                        <div className="flex items-center justify-center">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Sending...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <Send className="w-4 h-4 mr-2" />
                          Send Invite
                        </div>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Pending Invitations */}
              {pendingInvites.length > 0 && (
                <div className="card-3d p-4">
                  <h4 className="font-medium text-gray-800 mb-3">
                    Pending Invitations ({pendingInvites.length})
                  </h4>
                  <div className="space-y-2">
                    {pendingInvites.map(invite => (
                      <div key={invite.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{invite.email}</p>
                          <p className="text-xs text-gray-500">
                            {invite.role} • Sent {invite.sentDate.toLocaleDateString()}
                          </p>
                        </div>
                        <button className="text-orange text-sm font-medium">
                          Resend
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Requests Tab */}
          {activeTab === 'requests' && (
            <div className="space-y-3">
              {accessRequests.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No Pending Requests</h3>
                  <p className="text-gray-600 text-sm">
                    Access requests from family and friends will appear here
                  </p>
                </div>
              ) : (
                accessRequests.map(request => (
                  <div key={request.id} className="card-3d p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-orange/20 flex items-center justify-center">
                          <User className="w-5 h-5 text-orange" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-800">{request.name}</h3>
                          <p className="text-sm text-gray-600">{request.email}</p>
                          <p className="text-xs text-gray-500">
                            Requested {request.requestedAt.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {request.message && (
                      <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">{request.message}</p>
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <button className="flex-1 btn-3d btn-3d-mint py-2 text-gray-700 font-medium text-sm">
                        <Check className="w-4 h-4 mr-1" />
                        Accept
                      </button>
                      <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors">
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
