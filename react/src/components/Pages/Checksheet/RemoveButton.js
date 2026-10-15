import { IoClose } from "react-icons/io5";

export default function RemoveButton({ title, onClick, disabled }) {
    return (
        <div>
            <IoClose
                title={title}
                className="remove-button"
                onClick={(e) => {
                    e.stopPropagation();
                    onClick(e)
                }}
                disabled={disabled}
            />
        </div>
    )
}