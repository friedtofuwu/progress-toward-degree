import "../../css/Home.css";
import { Link } from 'react-router-dom';
import "./../../css/Forms.css"

export default function Home({ user }) {

    return (
        <div className="home-container">
            <div className="home-text">
                <h1>Welcome to the Student Advising Application for Computer Science (SAACS)</h1>
                <p>This tool is designed to help streamline the advising process for both students and advisors.</p>
                {user ? (
                    <>
                        {/*
                            <Link className="btn btn-primary" style={{width:"100px"}} to={"/ug/forceadd"}>Undergraduate Force Add</Link>
                            <Link className="btn btn-primary" style={{width:"100px"}} to={"/grad/forceadd"}>Graduate Force Add</Link>
                        */}
                        {((user.permissions & 1) == 1) &&
                            <Link className="btn btn-primary" style={{width:"100px"}} to={"/audits"}>Audits</Link>
                        }
                    </>
                ) : (<p>Click <a href="/api/login">here</a> to sign in.</p>)}
            </div>
        </div>

    );
}
