import { useState } from "react";
import RemoveButton from "./RemoveButton";
import DropdownIcon from "./DropdownIcon";
import AddRow from "./AddRow";

export default function SpecialClassTable({
    data,
    processingRequest,
    addNewSpecialCourse,
    removeSpecialCourse
}) {
    const [newCourse, setNewCourse] = useState('');

    const [isCollapsed, setIsCollapsed] = useState(true);
    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    return (
        <div className="checksheet-table-wrapper">
            <table>
                <thead>
                    <tr onClick={toggleCollapse}>
                        <td className="header-row" colSpan="3">
                            <div>
                                <DropdownIcon expanded={!isCollapsed} />
                                {'Special Courses'}
                            </div>
                        </td>
                    </tr>
                </thead>
                {!isCollapsed && (
                    <tbody>
                        {data.map((course, index) => (
                            <tr className='course-row' key={index}>
                                <td>{course}</td>
                                <td className="remove-cell">
                                    <RemoveButton
                                        title="Remove course"
                                        onClick={() => removeSpecialCourse(course)}
                                        disabled={processingRequest}
                                    />
                                </td>
                            </tr>
                        ))}
                        <AddRow
                            inputText="New course (e.g. CS1114)"
                            value={newCourse}
                            setValue={setNewCourse}
                            valueUpdateFn={(val) => val.replace(/\s+/g, '').toUpperCase()}
                            valueValidate={(val) => /^([A-Z]{1,8})([0-9][0-9A-Z]{0,5})$/.test(val) ? null : `Invalid format.`}
                            inputMaxLength={14}
                            buttonText="Add course"
                            addFn={() => addNewSpecialCourse(newCourse)}
                            processingRequest={processingRequest}
                        />
                    </tbody>
                )}
            </table>
        </div>
    );
};