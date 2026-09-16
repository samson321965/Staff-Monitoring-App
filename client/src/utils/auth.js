export const getAuthToken = () => localStorage.getItem("token");

export const isAuthenticated = () => Boolean(getAuthToken());

export const getAuthHeaders = () => {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Authentication token not found. Please login again.");
  }

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

export const logoutUser = (navigate) => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  if (navigate) {
    navigate("/", { replace: true });
  }
};
