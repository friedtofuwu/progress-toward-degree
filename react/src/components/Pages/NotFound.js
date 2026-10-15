import { Link } from "react-router-dom";

export default function NotFound() {
    return (
        <div className="center-wrapper">
            <h1>Page not found.</h1>

            <Link to="/">Return home</Link>
        </div>
    );
}
