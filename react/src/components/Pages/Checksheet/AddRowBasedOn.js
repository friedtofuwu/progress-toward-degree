export default function AddRowBasedOn({
    isTableRow = false,
    inputText,
    inputMaxLength = null,
    buttonText,
    entityName,
    value,
    setValue = () => { },
    valueUpdateFn = (value) => value,
    valueValidate = (value) => null,
    basedOn,
    setBasedOn = () => { },
    basedOnValues = [],
    minNumberVal = null,
    addFn = async () => { },
    processingRequest,
}) {
    const isNumber = minNumberVal !== null;
    const valueExists = basedOnValues.includes(value);
    const valueErrMsg = valueValidate(value);

    async function submit() {
        if (await addFn() !== false) {
            // Smart update inputs if successful and input is numeric
            if (isNumber) {
                const basedOnAsNumbers = basedOnValues?.map((elem) => +elem) || [];
                if (basedOnAsNumbers) {
                    const maxBasedOn = Math.max(...basedOnAsNumbers);
                    const minBasedOn = Math.min(...basedOnAsNumbers);

                    if (+value === maxBasedOn + 1) {
                        setValue(+value + 1);
                        basedOn === maxBasedOn && setBasedOn(maxBasedOn + 1);
                    } else if (+value === minBasedOn - 1 && +value > minNumberVal) {
                        setValue(+value - 1);
                        basedOn === minBasedOn && setBasedOn(minBasedOn - 1);
                    }
                }
            }
        }
    }

    function displayInputs() {
        return (
            <>
                <input
                    className="add-input"
                    value={value}
                    placeholder={inputText}
                    onChange={(e) => setValue(valueUpdateFn(e.target.value))}
                    onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
                    {...(isNumber ? {
                        type: 'number',
                        style: {
                            width: '4.75rem',
                            padding: '0.25rem 0.5rem 0.25rem 0.75rem'
                        },
                        min: minNumberVal
                    } : {
                        type: 'text',
                        style: {
                            minWidth: '6.5rem'
                        },
                        ...(inputMaxLength ? { maxLength: inputMaxLength } : {})
                    }
                    )}
                />
                {basedOnValues?.length > 0 && <select
                    className="add-button select"
                    value={basedOn}
                    onChange={(e) => setBasedOn(e.target.value || null)}
                >
                    <option value="">Based on... <small>(optional)</small></option>
                    {basedOnValues.map((basedOnVal, index) => (
                        <option key={index} value={basedOnVal}>{`Based on ${basedOnVal}`}</option>
                    ))}
                </select>}
            </>
        )
    }

    function displayButton() {
        return (
            <button
                className="add-button"
                onClick={submit}
                disabled={processingRequest || valueExists || valueErrMsg !== null}
                {...(valueExists
                    ? { title: `${entityName} ${value} already exists.` }
                    : valueErrMsg !== null
                        ? { title: valueErrMsg }
                        : {})
                }
            >
                {processingRequest ? 'Processing...' : buttonText}
            </button>
        )
    }

    if (isTableRow) {
        return (
            <tr className="add-row">
                <td className="add-input-cell" style={{ display: 'flex' }}>
                    {displayInputs()}
                </td>
                <td className="add-button-cell">
                    {displayButton()}
                </td>
            </tr>
        )
    } else {
        return (
            <div id="add-based-on-form">
                {displayInputs()}
                {displayButton()}
            </div>
        )
    }
}