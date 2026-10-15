export default function AddRow({
    inputText,
    inputMaxLength,
    value,
    setValue = () => { },
    valueUpdateFn = (value) => value,
    valueValidate = (value) => null,
    buttonText,
    addFn = async () => { },
    processingRequest = false
}) {
    async function submit() { if ((await addFn()) !== false) setValue('') }
    const valueErrMsg = valueValidate(value);

    return (
        <tr className="add-row">
            <td className="add-input-cell">
                <input
                    type="text"
                    placeholder={inputText}
                    {...(inputMaxLength ? { maxLength: inputMaxLength } : {})}
                    value={value}
                    onChange={(e) => setValue(valueUpdateFn(e.target.value))}
                    onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
                />
            </td>
            <td className="add-button-cell">
                <button
                    onClick={submit}
                    disabled={processingRequest || valueErrMsg !== null}
                    {...(valueErrMsg !== null
                        ? { title: valueErrMsg }
                        : {})
                    }
                >
                    {processingRequest ? 'Processing...' : buttonText}
                </button>
            </td>
        </tr>

    )
}
