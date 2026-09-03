import "../styles/Login.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUserShield,
  FaEnvelope,
  FaLock
} from "react-icons/fa";

function Login() {

  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);


  const handleLogin = async (e) => {

    e.preventDefault();

    setError("");
    setLoading(true);


    try {

      const response = await fetch(
        "https://staff-monitoring-app-web-service.onrender.com/api/auth/login",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            email,
            password
          })
        }
      );


      const data = await response.json();


      if (!response.ok) {

        setError(
          data.message || "Login failed"
        );

        setLoading(false);

        return;
      }


      // Save token
      localStorage.setItem(
        "token",
        data.token
      );


      // Save user information
      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );


      // Go to dashboard
      navigate("/dashboard");


    } catch (error) {

      console.error(error);

      setError(
        "Unable to connect to the server"
      );

    } finally {

      setLoading(false);

    }

  };


  return (

    <div className="login-container">

      <div className="login-card">


        <h1>

          <FaUserShield
            style={{
              marginRight: "10px",
              color: "#2563eb"
            }}
          />

          Staff Monitoring

        </h1>


        <p>
          Please sign in to continue
        </p>


        <form onSubmit={handleLogin}>


          <div className="input-group">

            <FaEnvelope className="input-icon" />

            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
            />

          </div>


          <div className="input-group">

            <FaLock className="input-icon" />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
            />

          </div>


          {error && (

            <p
              style={{
                color: "red",
                marginBottom: "10px"
              }}
            >

              {error}

            </p>

          )}


          <button
            type="submit"
            className="login-btn"
            disabled={loading}
          >

            {loading
              ? "Logging in..."
              : "Login"}

          </button>


        </form>


        <p className="footer-text">

          © 2026 Staff Monitoring System

        </p>


      </div>

    </div>

  );

}

export default Login;