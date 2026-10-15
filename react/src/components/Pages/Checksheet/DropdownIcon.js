import { IoCaretForward } from "react-icons/io5";

export default function DropdownIcon({ className, expanded, ...props }) {
    return (
        <IoCaretForward
            className={`expand-icon${expanded ? ' expanded' : ''}${className ? ` ${className}` : ''}`}
            {...props}
        />
    )
}