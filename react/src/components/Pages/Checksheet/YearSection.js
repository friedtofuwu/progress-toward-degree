import React, { useState } from "react";
import FocusSection from "./FocusSection";
import DropdownIcon from "./DropdownIcon";
import RemoveButton from "./RemoveButton";
import AddRowBasedOn from "./AddRowBasedOn";

export default function YearSection({
    data,
    processingRequest,
    isExpanded,
    onToggle,
    onToggleFocus,
    onRemoveYear,
    onAddNewFocus,
    onRemoveFocus,
    onAddRequiredCourse,
    onRemoveRequiredCourse
}) {
    const [newFocus, setNewFocus] = useState('');
    const [basedOnFocus, setBasedOnFocus] = useState(null);
    const yearExpanded = isExpanded(data.year)

    return (
        <>
            <tr className="header-row">
                <td className="year-cell" title="Expand year" onClick={onToggle}>
                    <div>
                        <DropdownIcon expanded={yearExpanded} />
                        {data.year}
                    </div>
                </td>
                <td className="remove-cell" onClick={onToggle}>
                    <RemoveButton
                        title="Remove year"
                        onClick={() => onRemoveYear(data.year)}
                        disabled={processingRequest}
                    />
                </td>
            </tr>
            {yearExpanded && data.focuses.map((focusData, focusIndex) => {
                const focusExpanded = isExpanded(data.year, focusData.focus)
                return (
                    <React.Fragment key={focusIndex}>
                        <tr className="major-row">
                            <td
                                className="major-cell"
                                onClick={() => onToggleFocus(data.year, focusData.focus)}
                            >
                                <DropdownIcon style={{ marginLeft: '0.25em' }} expanded={focusExpanded} />
                                {focusData.focus}
                            </td>
                            <td
                                className="remove-cell"
                                onClick={() => onToggleFocus(data.year, focusData.focus)}
                            >
                                <RemoveButton
                                    title="Remove major concentration"
                                    onClick={() => onRemoveFocus(data.year, focusData.focus)}
                                    disabled={processingRequest}
                                />
                            </td>
                        </tr>
                        <FocusSection
                            processingRequest={processingRequest}
                            isExpanded={isExpanded}
                            focusData={focusData}
                            year={data.year}
                            onAddRequiredCourse={onAddRequiredCourse}
                            onRemoveRequiredCourse={onRemoveRequiredCourse}
                        />
                    </React.Fragment>
                )
            })}
            {yearExpanded && (
                <AddRowBasedOn
                    isTableRow
                    inputText="New focus"
                    inputMaxLength={3}
                    buttonText="Add focus"
                    entityName="Focus"
                    value={newFocus}
                    valueUpdateFn={(val) => val.replace(/\s+/g, '').toUpperCase()}
                    valueValidate={(val) => /^[A-Z]{1,3}$/.test(val) ? null : `Focus must be made up of 1-3 capital letters.`}
                    setValue={setNewFocus}
                    basedOn={basedOnFocus}
                    setBasedOn={setBasedOnFocus}
                    basedOnValues={data.focuses.map(({ focus }) => focus)}
                    addFn={() => onAddNewFocus(data.year, newFocus, basedOnFocus)}
                    processingRequest={processingRequest}
                />
            )}
        </>
    );
};