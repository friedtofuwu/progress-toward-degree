import { IoHelpCircleOutline } from "react-icons/io5";

export default function TooltipIcon({ message }) {
    return (
        <IoHelpCircleOutline
            className="tooltip-icon"
            title={message}
        />
    )
}