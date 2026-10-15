import { useEffect, useState } from "react";
import "../../../css/Checksheet.scss";
import AddIcon from '@mui/icons-material/Add';
import ClassList from "./ClassList";
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

import axios from "axios";

import React from 'react'


function Checksheet() {
    const currentYear = new Date().getFullYear();
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [yearInput, setYearInput] = useState(''); 
    const [selectedDialogYear, setSelectedDialogYear] = useState("None"); 
    const [selectedYear, setSelectedYear] = useState(currentYear.toString()); 

    const [years, setYears] = useState([{year: currentYear.toString()}]); 
    const [shownYears, setShownYears] = useState([{year: currentYear.toString()}]); 

    const [openSnack, setOpenSnack] = useState(false);
    const [snackMessage, setSnackMessage] = useState('');
    const [snackSeverity, setSnackSeverity] = useState('');

    const [currClassList, setCurrClassList] = useState({ 
        year: currentYear.toString(), 
        lists: 
            [
                { "name": "core", "title": "CS Core", "classes": [] }, 
                { "name": "3xxx", "title": "CS 3XXX Electives", "classes": [] }, 
                { "name": "45xxx", "title": "CS 4/5XXX Electives", "classes": [] }, 
                { "name": "technical", "title": "Technical Electives (Non CS)", "classes": [] }, 
                { "name": "writing", "title": "Professional Writing", "classes": [] },
                { "name": "communications", "title": "Communications", "classes": [] },
                { "name": "cs", "title": "CS Specific", "classes": [] },
                { "name": "statistics", "title": "CS Statistics", "classes": [] },
                { "name": "theory", "title": "CS Theory Electives", "classes": [] },
                { "name": "capstone", "title": "CS Capstone", "classes": [] },
                { "name": "data-centric", "title": "DCC Specific", "classes": [] }, 
                { "name": "data-centric-statistics", "title": "DCC Statistics", "classes": [] },
                { "name": "data-centric-elective", "title": "DCC Electives", "classes": [] },
                { "name": "data-centric-capstone", "title": "DCC Capstones", "classes": [] },
                { "name": "secure", "title": "Secure Computing Specific", "classes": []},
                { "name": "secure-statistics", "title": "Secure Computing Statistics", "classes": []},
                { "name": "secure-elective", "title": "Secure Electives", "classes": [] },
                { "name": "secure-capstone", "title": "Secure Capstones", "classes": [] },
                { "name": "cs-minor-core", "title": "CS Minor Core", "classes": [] },
                { "name": "cs-minor-3/4/5XXX", "title": "CS Minor Elective", "classes": [] },
                { "name": "1", "title": "Pathway 1", "classes": [] },
                { "name": "2", "title": "Pathway 2", "classes": [] },
                { "name": "3", "title": "Pathway 3", "classes": [] },
                { "name": "4", "title": "Pathway 4", "classes": [] },
                { "name": "5", "title": "Pathway 5", "classes": [] },
                { "name": "6", "title": "Pathway 6", "classes": [] },
                { "name": "6a", "title": "Pathway 6a", "classes": [] },
            ] 
    })


    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                const yearList = await axios.get(`/api/checksheet/get/numbers`)
                const years = yearList.data
                if (years.length > 0 && years.find(year => year.year == selectedYear)){
                        const latestYear = selectedYear

                        const courses = await axios.get(`/api/checksheet/get/year/${latestYear}`);
                        const courseData = courses.data;

                        const updatedLists = currClassList.lists.map(list => {
                            // Find the courses for the current list category
                            const categoryCourses = courseData[list.name] || [];
        
                            // Return the updated list object with filled classes array
                            return {
                                ...list,
                                classes: categoryCourses
                            };
                        });
        
                        // Update currClassList with the updated lists
                        setCurrClassList({year:latestYear, lists: updatedLists});
                        setSelectedYear(latestYear)
        
                        // Update state with the fetched years
                        setYears(years);
                        setShownYears(years)
                }
                else{
                    setShownYears([...years, {year: selectedYear}])
                }

            }
            catch (error) {
                console.error('Error fetching initial data:', error);
                setSnackMessage('Error fetching initial data')
                setSnackSeverity('error')
                setOpenSnack(true)
            }
            finally{
                setLoading(false)
            }
        }

        fetchData()
    }, [selectedYear])

    const handleYearInputChange = (event) => {
        setYearInput(event.target.value);
    };

    const handleSubmit = async (values) => {
        const { yearInput, selectedDialogYear } = values;

        const exists = years.find(year => year === yearInput);

        if (exists || yearInput === ''){
            // List exists without being overwritten, nothing happens
        }
        else if (selectedDialogYear !== "None") {
            try {
                const res = await axios.post(`/api/checksheet/copy/${selectedDialogYear}/to/${yearInput}`)
                console.log(res)
                setShownYears([...shownYears, yearInput])
                setSnackMessage(`Successfully copied data from ${selectedDialogYear} to ${yearInput}`)
                setSnackSeverity('success')
                setOpenSnack(true)
            }
            catch(error){
                console.error('Error fetching initial data:', error);
                setSnackMessage('Error copying data')
                setSnackSeverity('error')
                setOpenSnack(true)
            }
            finally{
                setSelectedYear(yearInput);
            }

        } else {
            setShownYears([...shownYears, {year: yearInput}])
            setCurrClassList({ year: yearInput, lists:  [
                { "name": "core", "title": "CS Core", "classes": [] }, 
                { "name": "3xxx", "title": "CS 3XXX Electives", "classes": [] }, 
                { "name": "45xxx", "title": "CS 4/5XXX Electives", "classes": [] }, 
                { "name": "technical", "title": "Technical Electives (Non CS)", "classes": [] }, 
                { "name": "writing", "title": "Professional Writing", "classes": [] },
                { "name": "communications", "title": "Communications", "classes": [] },
                { "name": "cs", "title": "CS Specific", "classes": [] },
                { "name": "statistics", "title": "CS Statistics", "classes": [] },
                { "name": "theory", "title": "CS Theory Electives", "classes": [] },
                { "name": "capstone", "title": "CS Capstone", "classes": [] },
                { "name": "data-centric", "title": "DCC Specific", "classes": [] }, 
                { "name": "data-centric-statistics", "title": "DCC Statistics", "classes": [] },
                { "name": "data-centric-elective", "title": "DCC Electives", "classes": [] },
                { "name": "data-centric-capstone", "title": "DCC Capstones", "classes": [] },
                { "name": "secure", "title": "Secure Computing Specific", "classes": []},
                { "name": "secure-statistics", "title": "Secure Computing Statistics", "classes": []},
                { "name": "secure-elective", "title": "Secure Electives", "classes": [] },
                { "name": "secure-capstone", "title": "Secure Capstones", "classes": [] },
                { "name": "cs-minor-core", "title": "CS Minor Core", "classes": [] },
                { "name": "cs-minor-3/4/5XXX", "title": "CS Minor Elective", "classes": [] },
                { "name": "1", "title": "Pathway 1", "classes": [] },
                { "name": "2", "title": "Pathway 2", "classes": [] },
                { "name": "3", "title": "Pathway 3", "classes": [] },
                { "name": "4", "title": "Pathway 4", "classes": [] },
                { "name": "5", "title": "Pathway 5", "classes": [] },
                { "name": "6", "title": "Pathway 6", "classes": [] },
                { "name": "6a", "title": "Pathway 6a", "classes": [] },
            ] })

            setSelectedYear(yearInput);
        }
        setYearInput('')
        setSelectedDialogYear("None")
        handleClose();
    }

    const handleClickOpen = () => {
        setOpen(true);
      };
    
    const handleClose = () => {
        setOpen(false);
    };

    const handleCloseSnack = (event, reason) => {
        if (reason === 'clickaway') {
            return
        }

        setOpenSnack(false)
    }
    
    const handleSelectDialogYear = (event) => {
        setSelectedDialogYear(event.target.value);
    };

    const handleSelectYear = (event) => {
        setSelectedYear(event.target.value);

    };



    return (
        <div className="page-body">
            <Snackbar open={openSnack} autoHideDuration={5000} onClose={handleCloseSnack}>
                <Alert
                    onClose={handleCloseSnack}
                    severity={snackSeverity}
                    sx={{ width: '100%' }}
                >
                    {snackMessage}
                </Alert>
            </Snackbar>
            <h1>Checksheet Manager</h1>
            {loading ? (
                            <div>Loading Checksheet...</div>
                        ) : (
                            <>
            <div className="checksheet-container">
                <div className="header-row">
                    <div className="left-header">
                        <h2 className="year">
                            Year: 
                            <Select style={{ marginLeft: '.5rem' }} value={selectedYear} onChange={handleSelectYear}>
                                {shownYears.map((value) => {
                                    return (
                                        <MenuItem value={value.year}>{value.year}</MenuItem>
                                    );
                                })}
                            </Select>
                        </h2>
                    </div>

                    <button onClick={handleClickOpen} className="new-list-button">
                        <div>Add New Year</div>
                        <div><AddIcon/></div></button>

                </div>
                <h2 className="group-header">General Requirements of all Majors</h2>
                <div className="class-tables">
                    {currClassList.lists.slice(0,6).map((value) => { 
                        return(
                            <ClassList 
                                key={currClassList.year + value.title} 
                                year={currClassList.year} 
                                category={value.name} 
                                title={value.title} 
                                classes={value.classes} />
                    )})}
                </div>

                <h2 className="group-header">Concentration Requirements</h2>
                <h3 className="group-header">Computer Science Major Specific</h3>
                    <div className="class-tables">
                        {currClassList.lists.slice(6,10).map((value) => { 
                            return(
                                <ClassList 
                                    key={currClassList.year + value.title} 
                                    year={currClassList.year} 
                                    category={value.name} 
                                    title={value.title} 
                                    classes={value.classes} />
                        )})}
                    </div>
                <h3 className="group-header">Data-Centric Computing</h3>
                    <div className="class-tables">
                        {currClassList.lists.slice(10,14).map((value) => { 
                            return(
                                <ClassList 
                                    key={currClassList.year + value.title} 
                                    year={currClassList.year} 
                                    category={value.name} 
                                    title={value.title} 
                                    classes={value.classes} />
                        )})}
                    </div>
                <h3 className="group-header">Secure Computing</h3>
                    <div className="class-tables">
                        {currClassList.lists.slice(14,18).map((value) => { 
                            return(
                                <ClassList 
                                    key={currClassList.year + value.title} 
                                    year={currClassList.year} 
                                    category={value.name} 
                                    title={value.title} 
                                    classes={value.classes} />
                        )})}
                    </div>
                <h3 className="group-header">Computer Science Minor</h3>
                    <div className="class-tables">
                        {currClassList.lists.slice(18,20).map((value) => { 
                            return(
                                <ClassList 
                                    key={currClassList.year + value.title} 
                                    year={currClassList.year} 
                                    category={value.name} 
                                    title={value.title} 
                                    classes={value.classes} />
                        )})}
                    </div>
                <h3 className="group-header">Pathways</h3>
                    <div className="class-tables">
                        {currClassList.lists.slice(20,27).map((value) => { 
                            return(
                                <ClassList 
                                    key={currClassList.year + value.title} 
                                    year={currClassList.year} 
                                    category={value.name} 
                                    title={value.title} 
                                    classes={value.classes} />
                        )})}
                    </div>
            </div>
            <Dialog
                open={open}
                onClose={handleClose}
                onSubmit = {handleSubmit}>
                <DialogTitle>
                    Add Year
                </DialogTitle>
                <DialogContent>
                    <TextField style={{ marginBottom: '1rem' }} fullWidth label="Add Year" variant="standard" value={yearInput} onChange={handleYearInputChange}/>
                    <DialogContentText>
                        Copy From
                        <Select
                            style={{ marginLeft: '.5rem' }}
                            size = "small"
                            label="Year"
                            value={selectedDialogYear}
                            onChange={handleSelectDialogYear}>
                                <MenuItem value="None">None</MenuItem>
                            {years.map((value) => {
                                return (
                                    <MenuItem value={value.year}>{value.year}</MenuItem>
                                );
                            })}
                        </Select>
                    </DialogContentText>
                    </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button onClick={() => handleSubmit({ yearInput, selectedDialogYear })} autoFocus>
                        Submit
                    </Button>
                </DialogActions>
            </Dialog>
            </>)}
        </div>
    )
}

export default Checksheet
