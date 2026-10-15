import { useState } from "react";
import YearSection from "./YearSection";
import AddRowBasedOn from "./AddRowBasedOn";

export default function CollapsibleTable({
    data,
    processingRequest,
    isExpanded,
    toggleYear,
    toggleFocus,
    addNewYear,
    removeYear,
    addNewFocus,
    removeFocus,
    addNewRequiredCourse,
    removeRequiredCourse
}) {
    const [newYear, setNewYear] = useState(
        Object.keys(data)?.reduce((acc, year) => (year >= acc ? (+year) + 1 : acc), 0) || new Date(Date.now()).getFullYear()
    );
    const [basedOnYear, setBasedOnYear] = useState(null);

    return (
        <div className="checksheet-table-wrapper" style={{ marginTop: 0 }}>
            <AddRowBasedOn
                inputText="Year"
                inputMaxLength={4}
                buttonText="Add year"
                entityName="Year"
                value={newYear}
                valueUpdateFn={(value) => +value.toString().replace(/\s+/g, '').slice(0, 4) || ''}
                valueValidate={(val) => val >= 1872 && val <= 9999 ? null : `Invalid year. Please try a more reasonable value.`}
                setValue={setNewYear}
                basedOn={basedOnYear}
                setBasedOn={setBasedOnYear}
                basedOnValues={Object.keys(data).map((val) => +val)}
                minNumberVal={1872}
                addFn={() => addNewYear(newYear, basedOnYear)}
                processingRequest={processingRequest}
            />
            {Object.keys(data).length > 0 ?
                <table className="checksheet-table">
                    <tbody>
                        {Object.keys(data).map((year, index) => (
                            <YearSection
                                key={index}
                                data={{ year, focuses: data[year] }}
                                processingRequest={processingRequest}
                                isExpanded={isExpanded}
                                onToggle={() => toggleYear(year)}
                                onToggleFocus={toggleFocus}
                                onRemoveYear={removeYear}
                                onAddNewFocus={addNewFocus}
                                onRemoveFocus={removeFocus}
                                onAddRequiredCourse={addNewRequiredCourse}
                                onRemoveRequiredCourse={removeRequiredCourse}
                            />
                        ))}
                    </tbody>
                </table>
                :
                <div>
                    <p>There are currently no required courses in the system.</p>
                    <p>Use the form above to add a year (e.g. 2023).</p>
                    <p>From there you can add major focuses and their required courses.</p>
                </div>
            }
        </div>
    );
};