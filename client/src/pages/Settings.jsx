import React, { useEffect, useState } from "react";
import {
  FiSettings,
  FiUser,
  FiLock,
  FiEye,
  FiEyeOff,
  FiSave,
  FiCheckCircle,
  FiAlertCircle,
  FiShield,
} from "react-icons/fi";

import Sidebar from "../components/Sidebar";
import logo from "../assets/images/logo.png";

import "../styles/Settings.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const Settings = () => {
  /* =====================================================
     USER INFORMATION
     ===================================================== */

  const [user, setUser] = useState({
    id: "",
    username: "",
    email: "",
    role: "",
    employee_id: "",
  });

  /* =====================================================
     PASSWORD
     ===================================================== */

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  /* =====================================================
     SHOW / HIDE PASSWORD
     ===================================================== */

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  /* =====================================================
     STATUS
     ===================================================== */

  const [loading, setLoading] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");

  const [errorMessage, setErrorMessage] = useState("");

  /* =====================================================
     LOAD USER FROM LOCAL STORAGE
     ===================================================== */

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");

      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);

        setUser({
          id: parsedUser.id || "",
          username: parsedUser.username || "",
          email: parsedUser.email || "",
          role: parsedUser.role || "",
          employee_id: parsedUser.employee_id || "",
        });
      }
    } catch (error) {
      console.error(
        "Unable to load user information:",
        error
      );
    }
  }, []);

  /* =====================================================
     HANDLE PASSWORD INPUT
     ===================================================== */

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;

    setPasswordData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setSuccessMessage("");
    setErrorMessage("");
  };

  /* =====================================================
     PASSWORD VALIDATION
     ===================================================== */

  const validatePassword = () => {
    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = passwordData;

    if (!currentPassword) {
      return "Please enter your current password.";
    }

    if (!newPassword) {
      return "Please enter your new password.";
    }

    if (!confirmPassword) {
      return "Please confirm your new password.";
    }

    if (newPassword.length < 8) {
      return "New password must be at least 8 characters long.";
    }

    if (newPassword !== confirmPassword) {
      return "New password and confirm password do not match.";
    }

    if (currentPassword === newPassword) {
      return "Your new password must be different from your current password.";
    }

    return "";
  };

  /* =====================================================
     CHANGE PASSWORD
     ===================================================== */

  const handleChangePassword = async (e) => {
    e.preventDefault();

    setSuccessMessage("");
    setErrorMessage("");

    /* Validate fields */

    const validationError = validatePassword();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    /* Get JWT token */

    const token = localStorage.getItem("token");

    if (!token) {
      setErrorMessage(
        "Your login session has expired. Please log in again."
      );

      return;
    }

    try {
      setLoading(true);

      /* ================================================
         SEND REQUEST TO BACKEND

         PUT /api/auth/change-password
         ================================================ */

      const response = await fetch(
        `${API_URL}/auth/change-password`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            currentPassword:
              passwordData.currentPassword,

            newPassword:
              passwordData.newPassword,
          }),
        }
      );

      const data = await response.json();

      /* ================================================
         HANDLE BACKEND ERROR
         ================================================ */

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to update password."
        );
      }

      /* ================================================
         SUCCESS
         ================================================ */

      setSuccessMessage(
        data.message ||
          "Password updated successfully."
      );

      /* Clear fields */

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

    } catch (error) {
      console.error(
        "Change password error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to update password. Please try again."
      );

    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     PASSWORD STRENGTH
     ===================================================== */

  const getPasswordStrength = () => {
    const password = passwordData.newPassword;

    if (!password) {
      return "";
    }

    if (password.length < 8) {
      return "Weak";
    }

    let strength = 0;

    if (/[A-Z]/.test(password)) {
      strength++;
    }

    if (/[a-z]/.test(password)) {
      strength++;
    }

    if (/[0-9]/.test(password)) {
      strength++;
    }

    if (/[^A-Za-z0-9]/.test(password)) {
      strength++;
    }

    if (password.length >= 12) {
      strength++;
    }

    if (strength <= 2) {
      return "Weak";
    }

    if (strength === 3) {
      return "Medium";
    }

    return "Strong";
  };

  const passwordStrength =
    getPasswordStrength();

  /* =====================================================
     FORMAT ROLE
     ===================================================== */

  const formatRole = (role) => {
    if (!role) {
      return "Not available";
    }

    return role
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  /* =====================================================
     RETURN
     ===================================================== */

  return (
    <div className="settings-page">

      {/* =================================================
          SIDEBAR
          ================================================= */}

      <Sidebar />

      {/* =================================================
          MAIN CONTENT
          ================================================= */}

      <main className="settings-main">

        {/* Watermark */}

        <img
          src={logo}
          alt=""
          className="settings-watermark"
        />

        <div className="settings-content">

          {/* =================================================
              HEADER
              ================================================= */}

          <header className="settings-header">

            <div className="settings-title">

              <div className="settings-title-icon">
                <FiSettings />
              </div>

              <div>
                <h1>Settings</h1>

                <p>
                  Manage your account and security settings
                </p>
              </div>

            </div>

          </header>


          {/* =================================================
              SUCCESS MESSAGE
              ================================================= */}

          {successMessage && (
            <div className="settings-success">

              <FiCheckCircle />

              <span>
                {successMessage}
              </span>

            </div>
          )}


          {/* =================================================
              ERROR MESSAGE
              ================================================= */}

          {errorMessage && (
            <div className="settings-error">

              <FiAlertCircle />

              <span>
                {errorMessage}
              </span>

            </div>
          )}


          {/* =================================================
              SETTINGS GRID
              ================================================= */}

          <section className="settings-grid">

            {/* =================================================
                ACCOUNT INFORMATION
                ================================================= */}

            <div className="settings-panel">

              <div className="settings-panel-header">

                <div className="settings-panel-icon">
                  <FiUser />
                </div>

                <div>

                  <h2>
                    Account Information
                  </h2>

                  <p>
                    Your Staff Monitoring account
                    information
                  </p>

                </div>

              </div>


              <div className="settings-form">

                {/* Username */}

                <div className="settings-field">

                  <label>
                    Username
                  </label>

                  <div className="settings-input-wrapper">

                    <FiUser />

                    <input
                      type="text"
                      value={
                        user.username ||
                        "Not available"
                      }
                      disabled
                    />

                  </div>

                </div>


                {/* Email */}

                <div className="settings-field">

                  <label>
                    Email Address
                  </label>

                  <div className="settings-input-wrapper">

                    <FiUser />

                    <input
                      type="email"
                      value={
                        user.email ||
                        "Not available"
                      }
                      disabled
                    />

                  </div>

                </div>


                {/* Employee ID */}

                <div className="settings-field">

                  <label>
                    Employee ID
                  </label>

                  <div className="settings-input-wrapper">

                    <FiUser />

                    <input
                      type="text"
                      value={
                        user.employee_id ||
                        "Not available"
                      }
                      disabled
                    />

                  </div>

                </div>


                {/* Role */}

                <div className="settings-field">

                  <label>
                    System Role
                  </label>

                  <div className="settings-input-wrapper">

                    <FiShield />

                    <input
                      type="text"
                      value={formatRole(user.role)}
                      disabled
                    />

                  </div>

                </div>

              </div>

            </div>


            {/* =================================================
                CHANGE PASSWORD
                ================================================= */}

            <div className="settings-panel">

              <div className="settings-panel-header">

                <div className="settings-panel-icon">
                  <FiLock />
                </div>

                <div>

                  <h2>
                    Change Password
                  </h2>

                  <p>
                    Update your Staff Monitoring
                    account password
                  </p>

                </div>

              </div>


              <form
                className="settings-form"
                onSubmit={handleChangePassword}
              >

                {/* =================================================
                    CURRENT PASSWORD
                    ================================================= */}

                <div className="settings-field">

                  <label htmlFor="currentPassword">
                    Current Password
                  </label>

                  <div className="settings-input-wrapper">

                    <FiLock />

                    <input
                      id="currentPassword"
                      name="currentPassword"
                      type={
                        showCurrentPassword
                          ? "text"
                          : "password"
                      }
                      value={
                        passwordData.currentPassword
                      }
                      onChange={
                        handlePasswordChange
                      }
                      placeholder="Enter current password"
                      autoComplete="current-password"
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() =>
                        setShowCurrentPassword(
                          (previous) => !previous
                        )
                      }
                      aria-label={
                        showCurrentPassword
                          ? "Hide current password"
                          : "Show current password"
                      }
                    >

                      {showCurrentPassword ? (
                        <FiEyeOff />
                      ) : (
                        <FiEye />
                      )}

                    </button>

                  </div>

                </div>


                {/* =================================================
                    NEW PASSWORD
                    ================================================= */}

                <div className="settings-field">

                  <label htmlFor="newPassword">
                    New Password
                  </label>

                  <div className="settings-input-wrapper">

                    <FiLock />

                    <input
                      id="newPassword"
                      name="newPassword"
                      type={
                        showNewPassword
                          ? "text"
                          : "password"
                      }
                      value={
                        passwordData.newPassword
                      }
                      onChange={
                        handlePasswordChange
                      }
                      placeholder="Enter new password"
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() =>
                        setShowNewPassword(
                          (previous) => !previous
                        )
                      }
                      aria-label={
                        showNewPassword
                          ? "Hide new password"
                          : "Show new password"
                      }
                    >

                      {showNewPassword ? (
                        <FiEyeOff />
                      ) : (
                        <FiEye />
                      )}

                    </button>

                  </div>


                  {/* Password strength */}

                  {passwordData.newPassword && (
                    <div className="password-strength">

                      <span>
                        Password strength:
                      </span>

                      <strong
                        className={`strength-${passwordStrength.toLowerCase()}`}
                      >
                        {passwordStrength}
                      </strong>

                    </div>
                  )}


                  <small className="field-help">
                    Use at least 8 characters. A stronger
                    password should include uppercase letters,
                    lowercase letters, numbers and symbols.
                  </small>

                </div>


                {/* =================================================
                    CONFIRM PASSWORD
                    ================================================= */}

                <div className="settings-field">

                  <label htmlFor="confirmPassword">
                    Confirm New Password
                  </label>

                  <div className="settings-input-wrapper">

                    <FiLock />

                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      value={
                        passwordData.confirmPassword
                      }
                      onChange={
                        handlePasswordChange
                      }
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() =>
                        setShowConfirmPassword(
                          (previous) => !previous
                        )
                      }
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                    >

                      {showConfirmPassword ? (
                        <FiEyeOff />
                      ) : (
                        <FiEye />
                      )}

                    </button>

                  </div>


                  {/* Password match */}

                  {passwordData.confirmPassword && (
                    <div
                      className={
                        passwordData.newPassword ===
                        passwordData.confirmPassword
                          ? "password-match"
                          : "password-not-match"
                      }
                    >

                      {passwordData.newPassword ===
                      passwordData.confirmPassword
                        ? "✓ Passwords match"
                        : "✕ Passwords do not match"}

                    </div>
                  )}

                </div>


                {/* =================================================
                    CHANGE PASSWORD BUTTON
                    ================================================= */}

                <button
                  type="submit"
                  className="save-password-button"
                  disabled={loading}
                >

                  {loading ? (
                    <>
                      <span className="button-spinner"></span>

                      Updating Password...
                    </>
                  ) : (
                    <>
                      <FiSave />

                      Change Password
                    </>
                  )}

                </button>

              </form>

            </div>

          </section>


          {/* =================================================
              SECURITY INFORMATION
              ================================================= */}

          <section className="security-information">

            <div className="security-icon">
              <FiShield />
            </div>

            <div>

              <h3>
                Password Security
              </h3>

              <p>
                Your password is securely stored using
                bcrypt on the server. The encrypted
                password stored in PostgreSQL cannot be
                decrypted and displayed as plain text.
              </p>

            </div>

          </section>

        </div>

      </main>

    </div>
  );
};

export default Settings;

