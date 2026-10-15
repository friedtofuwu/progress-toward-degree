import { useState } from "react";
import RemoveButton from "./RemoveButton";
import AddRow from "./AddRow";

export default function FocusSection({
    processingRequest,
    isExpanded,
    focusData,
    year,
    onAddRequiredCourse,
    onRemoveRequiredCourse
}) {
    const [combinedClass, setCombinedClass] = useState('');
    const focusExpanded = isExpanded(year, focusData.focus);

    return (
        <>
            {focusExpanded && (
                <AddRow
                    inputText="New course (e.g. CS1114)"
                    value={combinedClass}
                    setValue={setCombinedClass}
                    valueUpdateFn={(val) => val.replace(/\s+/g, '').toUpperCase()}
                    valueValidate={(val) => /^([A-Z]{1,8})([0-9][0-9A-Z]{0,5})$/.test(val) ? null : `Invalid format.`}
                    inputMaxLength={14}
                    buttonText="Add course"
                    addFn={() => onAddRequiredCourse(year, focusData.focus, combinedClass)}
                    processingRequest={processingRequest}
                />
            )}
            {focusExpanded && focusData.courses.map((course, rowIndex) => (
                <tr key={rowIndex} className="course-row">
                    <td className="course-data" style={{ paddingLeft: '1em' }}>
                        {course}
                    </td>
                    <td className="remove-cell">
                        <RemoveButton
                            title="Remove course"
                            onClick={() => onRemoveRequiredCourse(year, focusData.focus, course)}
                            disabled={processingRequest}
                        />
                    </td>
                </tr>
            ))}
        </>
    );
};