import React, { useState, useEffect, useCallback } from 'react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PermissionStatus {
  accessibility: boolean;
  screenRecording: boolean;
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [permissions, setPermissions] = useState<PermissionStatus>({
    accessibility: false,
    screenRecording: false,
  });
  const [isChecking, setIsChecking] = useState(false);

  const electronAPI = window.electronAPI;

  const checkPermissions = useCallback(async () => {
    if (!electronAPI) return;
    
    setIsChecking(true);
    try {
      const result = await electronAPI.invoke('check-permissions', {
        id: electronAPI.generateId(),
        timestamp: Date.now(),
        channel: 'check-permissions',
      });

      if (result.success && result.data) {
        const permissionData = result.data as PermissionStatus;
        if (typeof permissionData.accessibility === 'boolean' && typeof permissionData.screenRecording === 'boolean') {
          setPermissions(permissionData);
        }
      }
    } catch {
      // TODO: Replace with proper logging system
      // console.error('Failed to check permissions:', error);
    }
    setIsChecking(false);
  }, [electronAPI]);

  useEffect(() => {
    if (isOpen) {
      checkPermissions();
    }
  }, [isOpen, checkPermissions]);

  const openAccessibilitySettings = async () => {
    if (!electronAPI) return;
    
    try {
      await electronAPI.invoke('open-accessibility-settings', {
        id: electronAPI.generateId(),
        timestamp: Date.now(),
        channel: 'open-accessibility-settings',
      });
    } catch {
      // TODO: Replace with proper logging system
      // console.error('Failed to open accessibility settings:', error);
    }
  };

  const openScreenRecordingSettings = async () => {
    if (!electronAPI) return;
    
    try {
      await electronAPI.invoke('open-screen-recording-settings', {
        id: electronAPI.generateId(),
        timestamp: Date.now(),
        channel: 'open-screen-recording-settings',
      });
    } catch {
      // TODO: Replace with proper logging system
      // console.error('Failed to open screen recording settings:', error);
    }
  };

  const requestAccessibilityPermission = async () => {
    if (!electronAPI) return;
    
    try {
      const result = await electronAPI.invoke('request-accessibility-permission', {
        id: electronAPI.generateId(),
        timestamp: Date.now(),
        channel: 'request-accessibility-permission',
      });

      if (result.success) {
        // Re-check permissions after request
        await checkPermissions();
      }
    } catch {
      // TODO: Replace with proper logging system
      // console.error('Failed to request accessibility permission:', error);
    }
  };

  const requestScreenRecordingPermission = async () => {
    if (!electronAPI) return;
    
    try {
      const result = await electronAPI.invoke('request-screen-recording-permission', {
        id: electronAPI.generateId(),
        timestamp: Date.now(),
        channel: 'request-screen-recording-permission',
      });

      if (result.success) {
        // Re-check permissions after request
        await checkPermissions();
      }
    } catch {
      // TODO: Replace with proper logging system
      // console.error('Failed to request screen recording permission:', error);
    }
  };

  if (!isOpen) return null;

  const allPermissionsGranted = permissions.accessibility && permissions.screenRecording;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>🔐 Permission Setup Required</h2>
          <p>
            AI Desktop Automation needs access to your system to record and replay workflows.
            Please grant the following permissions:
          </p>
        </div>

        <div className="permissions-list">
          <div className={`permission-item ${permissions.accessibility ? 'granted' : 'required'}`}>
            <div className="permission-info">
              <div className="permission-icon">
                {permissions.accessibility ? '✅' : '🔴'}
              </div>
              <div className="permission-details">
                <h3>Accessibility Permission</h3>
                <p>Required to read window information and control applications</p>
              </div>
            </div>
            {!permissions.accessibility && (
              <div className="permission-buttons">
                <button 
                  className="btn btn-primary"
                  onClick={requestAccessibilityPermission}
                >
                  Request Permission
                </button>
                <button 
                  className="btn btn-outline"
                  onClick={openAccessibilitySettings}
                >
                  Open Settings
                </button>
              </div>
            )}
          </div>

          <div className={`permission-item ${permissions.screenRecording ? 'granted' : 'required'}`}>
            <div className="permission-info">
              <div className="permission-icon">
                {permissions.screenRecording ? '✅' : '🔴'}
              </div>
              <div className="permission-details">
                <h3>Screen Recording Permission</h3>
                <p>Required to capture screen content during workflow recording</p>
              </div>
            </div>
            {!permissions.screenRecording && (
              <div className="permission-buttons">
                <button 
                  className="btn btn-primary"
                  onClick={requestScreenRecordingPermission}
                >
                  Request Permission
                </button>
                <button 
                  className="btn btn-outline"
                  onClick={openScreenRecordingSettings}
                >
                  Open Settings
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="modal-instructions">
          <h3>📋 Setup Instructions</h3>
          <ol>
            <li>Click &quot;Request Permission&quot; to trigger the macOS permission dialog</li>
            <li>If no dialog appears, click &quot;Open Settings&quot; and manually add the app</li>
            <li>In System Preferences/Settings, find &quot;AI Desktop Automation&quot; in the list</li>
            <li>Check the box next to the app name to grant permission</li>
            <li>Click &quot;Check Permissions&quot; to verify the setup</li>
          </ol>
        </div>

        <div className="modal-footer">
          <button 
            className="btn btn-outline"
            onClick={checkPermissions}
            disabled={isChecking}
          >
            {isChecking ? 'Checking...' : 'Check Permissions'}
          </button>
          
          {allPermissionsGranted ? (
            <button 
              className="btn btn-success"
              onClick={onClose}
            >
              Continue to App
            </button>
          ) : (
            <button 
              className="btn btn-secondary"
              onClick={onClose}
            >
              Skip for Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}