import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import { useState, useEffect } from "react";
import "./css/global.scss";

import Home from "./components/Pages/Home";
import NotFound from "./components/Pages/NotFound";
import Checksheet from "./components/Pages/Checksheet";
import Navbar from "./components/Topbar/Navbar";
import Admin from "./components/Pages/Admin";
import Loading from "./components/Pages/Loading";
import { statusIsGood } from "./helpers/http";
import Unauthorized from "./components/Pages/Unauthorized";
import ForceAddAdmin from "./components/Pages/ForceAdd/ForceAddAdmin";
import ForceAddForm from "./components/Pages/ForceAdd/ForceAddForm";
import StudentForceAddTable from "./components/Pages/ForceAdd/StudentForceAddTable";
import AdvisorForceAddTable from "./components/Pages/ForceAdd/AdvisorForceAddTable";
import AdvisorReview from "./components/Pages/ForceAdd/AdvisorReview";
import StudentReview from "./components/Pages/ForceAdd/StudentReview";
import UG_ForceAddAdmin from "./components/Pages/UG_ForceAdd/UG_ForceAddAdmin";
import UG_ForceAddForm from "./components/Pages/UG_ForceAdd/UG_ForceAddForm";
import UG_StudentForceAddTable from "./components/Pages/UG_ForceAdd/UG_StudentForceAddTable";
import UG_AdvisorForceAddTable from "./components/Pages/UG_ForceAdd/UG_AdvisorForceAddTable";
import UG_AdvisorReview from "./components/Pages/UG_ForceAdd/UG_AdvisorReview";
import UG_StudentReview from "./components/Pages/UG_ForceAdd/UG_StudentReview";
import Grad_ForceAddAdmin from "./components/Pages/Grad_ForceAdd/Grad_ForceAddAdmin";
import Grad_ForceAddForm from "./components/Pages/Grad_ForceAdd/Grad_ForceAddForm";
import Grad_StudentForceAddTable from "./components/Pages/Grad_ForceAdd/Grad_StudentForceAddTable";
import Grad_AdvisorForceAddTable from "./components/Pages/Grad_ForceAdd/Grad_AdvisorForceAddTable";
import Grad_AdvisorReview from "./components/Pages/Grad_ForceAdd/Grad_AdvisorReview";
import Grad_StudentReview from "./components/Pages/Grad_ForceAdd/Grad_StudentReview";
import LoginReroute from "./components/Pages/LoginReroute";
import Audits from "./components/Pages/Progress_Toward_Degree/Audits";
import StudentsList from "./components/Pages/Progress_Toward_Degree/StudentsList";
import StudentProgressPage from "./components/Pages/Progress_Toward_Degree/StudentProgressPage";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getCurrentUser() {
      await fetch("/api/currentUser")
        .then(async (res) => {
          if (statusIsGood(res.status)) {
            return res.json();
          }
        })
        .then((data) => {
          if (data?.user) setUser(data.user);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        })
        .finally(() => setLoading(false));
    }
    getCurrentUser();
  }, []);

  if (loading) return <Loading />;
  else {
    // Authenticated
    return (
      <Router>
        <Navbar user={user} />
        {user?.demo && (
          <aside style={{ background: '#fff3cd', color: '#493a0a', padding: '12px 20px', textAlign: 'center' }}>
            Portfolio demo · You are trying the advisor workflow. Use fictional test data only.
            {' '}Audit results belong to this browser session. <a href="/audits">Start an audit</a>
          </aside>
        )}
        <div className="page-contents">
          <Routes>
            <Route path="/" element={<Home user={user} />} />
            {user ? (
              // Only accessible when user is logged in
              <>
                {/*((user?.permissions & 3) > 0) //Advisor/Admin VS Not (student)
                                    ? <>
                                        <Route path="/dashboard" element={<AdvisorForceAddTable />} />
                                        <Route path="/" element={<AdvisorForceAddTable />} />
                                    </>:<>
                                        <Route path="/dashboard" element={<StudentForceAddTable />} />
                                        <Route path="/" element={<StudentForceAddTable />} />
                                    </>
                                */}
                {(user.permissions & 1) == 1 && (
                  <>
                  </>
                )}
                {(user.permissions & 1) == 1 && (
                  <>
                    {/* <Route path="/ptd" element={<PTDHome />} /> This is a progress towards degree instruction page*/}
                    <Route path="/audits" element={<Audits user={user} />} />
                    <Route path="/audit/:audit_id" element={<StudentsList />} />
                    <Route
                      path="/audit/:audit_id/student/:student_id"
                      element={<StudentProgressPage />}
                    />
                    <Route path="/checksheet" element={<Checksheet />} />
                    {/* <Route path="/audit/:id" element={<Audit />} /> */}
                    {/* <Route path="/student/:id" element={<StudentPage />} /> */}
                  </>
                )}

                {(user?.permissions & 2) == 2 ? (
                  <Route path="/admin" element={<Admin CurrentUser={user} />} />
                ) : (
                  <Route path="/admin" element={<Unauthorized />} />
                )}
                {(user?.permissions & 2) == 2 ? (
                  <Route
                    path="/ug/forceaddmin"
                    element={<UG_ForceAddAdmin />}
                  />
                ) : (
                  <Route path="/ug/forceaddmin" element={<Unauthorized />} />
                )}
                <Route
                  path="/ug/forms/forceadd"
                  element={<UG_ForceAddForm />}
                />
                {(user?.permissions & 3) > 0 ? ( //Advisor/Admin VS Not (student)
                  <>
                    <Route
                      path="/ug/forceadd"
                      element={<UG_AdvisorForceAddTable />}
                    />
                    <Route
                      path="/ug/forceadd/:key"
                      element={<UG_AdvisorReview />}
                    />
                  </>
                ) : (
                  <>
                    <Route
                      path="/ug/forceadd"
                      element={<UG_StudentForceAddTable />}
                    />
                    <Route
                      path="/ug/forceadd/:key"
                      element={<UG_StudentReview />}
                    />
                  </>
                )}
                {(user?.permissions & 2) == 2 ? (
                  <Route
                    path="/grad/forceaddmin"
                    element={<Grad_ForceAddAdmin />}
                  />
                ) : (
                  <Route path="/grad/forceaddmin" element={<Unauthorized />} />
                )}
                <Route
                  path="/grad/forms/forceadd"
                  element={<Grad_ForceAddForm />}
                />
                {(user?.permissions & 3) > 0 ? ( //Advisor/Admin VS Not (student)
                  <>
                    <Route
                      path="/grad/forceadd"
                      element={<Grad_AdvisorForceAddTable />}
                    />
                    <Route
                      path="/grad/forceadd/:key"
                      element={<Grad_AdvisorReview />}
                    />
                  </>
                ) : (
                  <>
                    <Route
                      path="/grad/forceadd"
                      element={<Grad_StudentForceAddTable />}
                    />
                    <Route
                      path="/grad/forceadd/:key"
                      element={<Grad_StudentReview />}
                    />
                  </>
                )}
              </>
            ) : (
              // Only accessible when user is NOT logged in
              <>
                <Route path="*" element={<LoginReroute />} />
                <Route path="/unauthorized" element={<Unauthorized />} />
              </>
            )}
            {
              //<Route path='*' element={<NotFound />} />
            }
          </Routes>
        </div>
      </Router>
    );
  }
}
