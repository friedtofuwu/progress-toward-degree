import { Link } from "react-router-dom";

const data = [
    {
        title: 'Submitting an Excel file',
        content: [
            <>
                1. Click on the <Link to="/submissions">Submissions</Link> button in the navigation bar.
            </>,
            '2. In the "Import" section, select or drag-and-drop the Excel file you would like to import.',
            '3. Click on the upload button and wait for the file to process. This may take a few minutes.'
        ]
    },
    {
        title: 'Exporting the latest submission',
        content: [
            <>
                1. Click on the <Link to="/submissions">Submissions</Link> button in the navigation bar.
            </>,
            '2. In the "Export" section, click on the download button and wait for the export to process.',
            '3. Within a few minutes, the file will download with the timestamp of the submission in the filename.'
        ]
    },
    {
        title: 'Updating the Checksheet',
        content: [
            <>
                1. Click on the <Link to="/checksheet">Checksheet</Link> button in the navigation bar.
            </>,
            '2. Click on the drop arrow of a specific degree requirement and click the plus icon to add a new class.',
            '3. Insert class information and click submit to add it to the Checksheet.',
        ]
    },
    {
        title: 'Searching for a student',
        content: [
            <>
                1. Click on the <Link to="/students">Search</Link> button in the navigation bar.
            </>,
            '2. Enter the student\'s ID or Name in the search bar.',
            '3. Click on the "Search" button.',
            '4. Press "Clear" button to get original data after search.',
        ]
    },
    {
        title: 'Filtering by advisor',
        content: [
            <>
                1. Click on the <Link to="/students">Search</Link> button in the navigation bar.
            </>,
            '2. Click on the "Filter" icon.',
            '3. Check any advisors you would like to include/exclude from the list.',
        ]
    },
    {
        title: 'Viewing Missing Courses',
        content: [
            <>
                1. Click on the <Link to="/students">Search</Link> button in the navigation bar.
            </>,
            '2. Click on the Eye Icon to view missing courses that are required for graduation.',
            <>
                3. Press the browser back button or the  <Link to="/students">Students</Link> button in the navigation bar to go back to students.
            </>
        ]
    },
    {
        title: 'Viewing Student Violations',
        content: [
            <>
                1. Click on the <Link to="/students">Search</Link> button in the navigation bar.
            </>,
            '2. Click on the Underlined Student ID to view student violations.',
            <>
                3. Press the browser back button or the  <Link to="/students">Search</Link> button in the navigation bar to go back to students.
            </>
        ]
    },
];

export default data;
