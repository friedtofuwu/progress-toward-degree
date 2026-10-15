import { FileUploader } from "react-drag-drop-files";
import { LuFileSpreadsheet } from "react-icons/lu";
import { IoClose, IoCloudUploadOutline } from "react-icons/io5";
import '../../css/FileInput.scss'
import { useState } from "react";

export default function FileInput({ file = null, clearFile, fileTypes, handleChange, onTypeError, onSizeError }) {
    const message = file ? file.name : "Upload an XLSX file";
    const [isDragging, setIsDragging] = useState(false);

    return (
        <FileUploader
            multiple={true}
            name="file"
            handleChange={handleChange}
            types={fileTypes}
            onTypeError={onTypeError}
            onSizeError={onSizeError}
            onDraggingStateChange={(dragging) => setIsDragging(dragging)}
            dropMessageStyle={{ display: 'none' }}
            children={
                <div
                    className={`file-input${isDragging ? ' dragging' : ''}${file ? ' has-file' : ''}`}
                    title={`Select a${file ? ' different' : ''} file`}
                >
                    {file
                        ? <LuFileSpreadsheet className="upload-icon file" />
                        : <IoCloudUploadOutline className="upload-icon" />}
                    <label>{message}</label>
                    {file ? <IoClose
                        className="file-clear-bttn"
                        title="Clear file"
                        onMouseDown={(e) => {
                            clearFile()
                            e.stopPropagation()
                        }}
                    /> : null}
                </div>
            }
        />
    )
}