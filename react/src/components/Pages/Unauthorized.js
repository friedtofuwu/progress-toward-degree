import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";

export default function Unauthorized(path) {
    const location = useLocation();
    const baseUrl = window.location.origin;
    return (
        <div className="center-wrapper">
            <h2>You are not currently authorized to use: </h2>
            <h2>{baseUrl + location.pathname}</h2>
            <h3>Please contact an administrator for assistance.</h3>

            <Link to="/">Return home</Link>
        </div>
    );
}
