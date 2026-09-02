import React from "react";
import {
  FaEllipsisH
} from "react-icons/fa";

function AttendanceTable() {
  return (
    <div className="table-container">

      <table className="attendance-table">

        <thead>
          <tr>
            <th>Employee</th>
            <th>Department</th>
            <th>Check In</th>
            <th>Check Out</th>
            <th>Status</th>
            <th>Working Hours</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>

          <tr>

            <td>
              <div className="employee">

                <img
                  src="https://i.pravatar.cc/100?img=11"
                  alt="Employee"
                />

                <div>
                  <h4>Peter Joe</h4>
                  <p>EMP-0012</p>
                </div>

              </div>
            </td>

            <td>Operations</td>

            <td className="green-time">
              08:02 AM
            </td>

            <td className="green-time">
              04:35 PM
            </td>

            <td>
              <span className="status present">
                Present
              </span>
            </td>

            <td>8h 33m</td>

            <td>
              <button className="action-btn">
                <FaEllipsisH />
              </button>
            </td>

          </tr>

          <tr>

            <td>
              <div className="employee">

                <img
                  src="https://i.pravatar.cc/100?img=12"
                  alt="Employee"
                />

                <div>
                  <h4>Mary Smith</h4>
                  <p>EMP-0025</p>
                </div>

              </div>
            </td>

            <td>Administration</td>

            <td className="yellow-time">
              08:15 AM
            </td>

            <td className="green-time">
              04:45 PM
            </td>

            <td>
              <span className="status late">
                Late
              </span>
            </td>

            <td>8h 30m</td>

            <td>
              <button className="action-btn">
                <FaEllipsisH />
              </button>
            </td>

          </tr>

          <tr>

            <td>
              <div className="employee">

                <img
                  src="https://i.pravatar.cc/100?img=13"
                  alt="Employee"
                />

                <div>
                  <h4>John Tari</h4>
                  <p>EMP-0031</p>
                </div>

              </div>
            </td>

            <td>ICT</td>

            <td className="green-time">
              07:58 AM
            </td>

            <td className="green-time">
              04:30 PM
            </td>

            <td>
              <span className="status present">
                Present
              </span>
            </td>

            <td>8h 32m</td>

            <td>
              <button className="action-btn">
                <FaEllipsisH />
              </button>
            </td>

          </tr>

          <tr>

            <td>
              <div className="employee">

                <img
                  src="https://i.pravatar.cc/100?img=14"
                  alt="Employee"
                />

                <div>
                  <h4>Alice Garae</h4>
                  <p>EMP-0044</p>
                </div>

              </div>
            </td>

            <td>Finance</td>

            <td className="red-time">
              09:05 AM
            </td>

            <td className="red-time">
              -
            </td>

            <td>
              <span className="status absent">
                Absent
              </span>
            </td>

            <td>0h 00m</td>

            <td>
              <button className="action-btn">
                <FaEllipsisH />
              </button>
            </td>

          </tr>

          <tr>

            <td>
              <div className="employee">

                <img
                  src="https://i.pravatar.cc/100?img=15"
                  alt="Employee"
                />

                <div>
                  <h4>James Kaltapau</h4>
                  <p>EMP-0050</p>
                </div>

              </div>
            </td>

            <td>Logistics</td>

            <td className="yellow-time">
              08:47 AM
            </td>

            <td className="green-time">
              04:40 PM
            </td>

            <td>
              <span className="status late">
                Late
              </span>
            </td>

            <td>7h 53m</td>

            <td>
              <button className="action-btn">
                <FaEllipsisH />
              </button>
            </td>

          </tr>

        </tbody>

      </table>

      <div className="pagination">

        <button>{"<<"}</button>

        <button className="active">1</button>

        <button>2</button>

        <button>3</button>

        <button>{">>"}</button>

      </div>

    </div>
  );
}

export default AttendanceTable;