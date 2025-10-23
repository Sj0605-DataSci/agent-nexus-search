import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiClient } from '../../../lib/api/apiClient';
import { UserProfile } from '../../../types/profile';
import { User, Mail, ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import './styles.css';

function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { signOut } = useAuth();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await apiClient.fetchProfile();
      setProfile(data);
    } catch (error: any) {
      console.error('Failed to fetch profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const result = await signOut();
      if (result.success) {
        toast.success('Logged out successfully');
        navigate('/');
      } else {
        toast.error(result.error || 'Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed');
    }
  };

  const handleBack = () => {
    navigate('/upload');
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="profile-content">
          <div className="profile-skeleton">
            <div className="skeleton-header"></div>
            <div className="skeleton-card"></div>
            <div className="skeleton-card"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-container">
        <div className="profile-content">
          <div className="error-state">
            <p>Failed to load profile</p>
            <button onClick={fetchProfile} className="retry-button">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <button onClick={handleBack} className="back-button">
          <ArrowLeft size={20} />
          Back to Upload
        </button>
        <button onClick={handleLogout} className="logout-button">
          <LogOut size={18} />
          Logout
        </button>
      </div>

      <div className="profile-content">
        <h1 className="profile-title">My Profile</h1>

        {/* Profile Header Card */}
        <div className="profile-card">
          <div className="profile-info">
            <div className="profile-avatar">
              <User size={32} />
            </div>
            <div className="profile-details">
              <h2 className="profile-name">
                {profile.full_name || 'Anonymous User'}
              </h2>
              <p className="profile-member-since">
                Member since:{' '}
                {profile.created_at
                  ? new Date(profile.created_at).toLocaleDateString()
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Email Card */}
        <div className="profile-card">
          <div className="card-header">
            <div className="card-icon-wrapper email-icon">
              <Mail size={20} />
            </div>
            <div>
              <h3 className="card-title">Email Address</h3>
              <p className="card-value">{profile.email}</p>
            </div>
          </div>
        </div>

        {/* LinkedIn Card */}
        {profile.linkedin_url && (
          <div className="profile-card">
            <div className="card-header">
              <div className="card-icon-wrapper linkedin-icon">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </div>
              <div>
                <h3 className="card-title">LinkedIn Profile</h3>
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card-link"
                >
                  View Profile →
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Account Settings */}
        <div className="profile-section">
          <h2 className="section-title">Account Settings</h2>

          {/* Email Subscription */}
          <div className="profile-card">
            <div className="setting-row">
              <div className="setting-info">
                <div className="setting-icon-wrapper">
                  <Mail size={20} />
                </div>
                <div>
                  <h3 className="setting-title">Email Notifications</h3>
                  <p className="setting-description">
                    Receive email notifications based on your activity
                  </p>
                </div>
              </div>
              <div className="toggle-wrapper">
                <input
                  type="checkbox"
                  id="email-subscription"
                  className="toggle-input"
                  checked={profile.email_subscription || false}
                  readOnly
                />
                <label htmlFor="email-subscription" className="toggle-label">
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>

          {/* Connections Status */}
          {profile.has_connections && (
            <div className="profile-card">
              <div className="setting-row">
                <div className="setting-info">
                  <div className="setting-icon-wrapper">
                    <User size={20} />
                  </div>
                  <div>
                    <h3 className="setting-title">Connections Status</h3>
                    <p className="setting-description">
                      {profile.has_connections === 'synced'
                        ? 'Your connections are synced'
                        : profile.has_connections === 'syncing'
                        ? 'Syncing your connections...'
                        : 'No connections data'}
                    </p>
                  </div>
                </div>
                <span
                  className={`status-badge ${
                    profile.has_connections === 'synced'
                      ? 'status-synced'
                      : profile.has_connections === 'syncing'
                      ? 'status-syncing'
                      : 'status-no-data'
                  }`}
                >
                  {profile.has_connections}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;
