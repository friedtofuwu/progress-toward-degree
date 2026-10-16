import React, { useEffect } from 'react'
import { staticDemo } from '../../../staticDemo/client';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
//import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import axios from "axios";
import { MenuItem } from '@mui/material';
import Select from '@mui/material/Select';


function SimpleDialog(props) {
    const { onClose, open, title, onSubmit } = props;
    const [checked, setChecked] = React.useState(false);
    const [checkedRepeatable, setCheckedRepeatable] = React.useState(false);
    const [subject, setSubject] = React.useState('');
    const [course_number, setcourse_number] = React.useState(null);
    const [credit_hours, setCreditHours] = React.useState(null);
    const [substitutes, setSubstitution] = React.useState([{ subject: '', course_number: '', credit_hours: null }]);
    const [concEligible, setConcEligible] = React.useState('cs')
    const [passingGrade, setPassingGrade] = React.useState('D-')

    const handleAddCourse = () => {
      setSubstitution([...substitutes, { subject: '', course_number: '', credit_hours: '' }])
    };

    const handleDeleteCourse = (index) => {
      const newSubstitution = [...substitutes];
    newSubstitution.splice(index, 1);
    setSubstitution(newSubstitution);
    };

  
    const handleClose = () => {
      onClose();
    };

    const handleChecked = () => {
        setChecked(!checked)
    }

    const handleRepeatable = () => {
      setCheckedRepeatable(!checkedRepeatable)
  }

    const handleSubjectChange = (event) => {
      setSubject(event.target.value);
    };
  
    const handlecourse_numberChange = (event) => {
      setcourse_number(String(event.target.value));
    };

    const handleCreditHourChange = (event) => {
      setCreditHours(event.target.value);
    };

    const handleCreditSubjectChange = (event, index) => {
      const newSubstitution = [...substitutes]
      newSubstitution[index].subject = event.target.value;
      setSubstitution(newSubstitution);
    };
  
    const handleCreditcourse_numberChange = (event, index) => {
      const newSubstitution = [...substitutes];
      newSubstitution[index].course_number = String(event.target.value);
      setSubstitution(newSubstitution);

    };

    const handleCreditCreditHourChange = (event, index) => {
      const newSubstitution = [...substitutes];
      newSubstitution[index].credit_hours = event.target.value;
      setSubstitution(newSubstitution);
    };

    const handleConcChange = (event) => {
        setConcEligible(event.target.value);
    }

    const handlePassingGrade = (event) => {
      setPassingGrade(event.target.value);
    };

    const handleSubmit = () => {
      const subs = substitutes.filter(val => val.subject != '' && val.course_number != '' && val.subject != '')
      if (onSubmit && subject != '' && course_number && credit_hours) {
          onSubmit({subject, course_number, credit_hours, checkedRepeatable, concEligible, passingGrade, substitutes: subs ? subs : []});
      }
      handleClose();
      setSubstitution([{ subject: '', course_number: '', credit_hours: null }]);
      setChecked(false)
      setCheckedRepeatable(false)
      setcourse_number('')
      setCreditHours(null)
      setSubject('')
      setConcEligible('cs');
      setPassingGrade('D-');
    };
  
    return (
      <Dialog onClose={handleClose} open={open}>
        <DialogTitle>Add Additional Course</DialogTitle>
        <DialogContent>
            <DialogContentText>
              {title}
            </DialogContentText>
            <TextField
            autoFocus
            required
            margin="dense"
            id="subject"
            name="subject"
            label="Subject"
            type="text"
            variant="standard"
            style ={{marginRight: '10%', width: '45%'}}
            onChange={handleSubjectChange}
          />
          <TextField
            required
            margin="dense"
            id="course_number"
            name="course number"
            label="Course Number"
            type="text"
            variant="standard"
            style ={{width: '45%'}}
            onChange={handlecourse_numberChange}
          />
          <TextField
            required
            margin="dense"
            id="creditHours"
            name="credit hours"
            label="Credit Hours"
            type="number"
            variant="standard"
            fullWidth
            onChange={handleCreditHourChange}
          />
          <table style={{width:'100%', border: '0px solid black'}}>
            <tr>
              <td>
                <DialogContentText>
                  Is Repeatable?
                  <IconButton onClick={handleRepeatable}>
                    <Checkbox
                      checked={checkedRepeatable}
                      tabIndex={-1}
                      />
                  </IconButton>
                </DialogContentText>
              </td>
              <td>
                <DialogContentText>
                  Passing Grade
                  <Select value={passingGrade} onChange={handlePassingGrade}>
                    <MenuItem value={"A+"}>A+</MenuItem>
                    <MenuItem value={"A"}>A</MenuItem>
                    <MenuItem value={"A-"}>A-</MenuItem>
                    <MenuItem value={"B+"}>B+</MenuItem>
                    <MenuItem value={"B"}>B</MenuItem>
                    <MenuItem value={"B-"}>B-</MenuItem>
                    <MenuItem value={"C+"}>C+</MenuItem>
                    <MenuItem value={"C"}>C</MenuItem>
                    <MenuItem value={"C-"}>C-</MenuItem>
                    <MenuItem value={"D+"}>D+</MenuItem>
                    <MenuItem value={"D"}>D</MenuItem>
                    <MenuItem value={"D-"}>D-</MenuItem>
                    <MenuItem value={"F+"}>F+</MenuItem>
                    <MenuItem value={"F"}>F</MenuItem>
                    <MenuItem value={"F-"}>F-</MenuItem>
                  </Select>
                </DialogContentText>
              </td>
            </tr>
          </table>
          <DialogContentText>
            { 'Does this class count towards a required elective for a concentration other than CS?'}
          </DialogContentText>
          <RadioGroup 
            row
            onChange={handleConcChange}
            value={concEligible}
            defaultValue="cs"
            style={{display:"none"}}>
            <FormControlLabel value="Secure" control={<Radio />} label="Secure" />
            <FormControlLabel value="DCC" control={<Radio />} label="DCC" />
            <FormControlLabel value="cs" control={<Radio />} label="No" />
          </RadioGroup>
          <DialogContentText>
                Can be Substitued?
                <IconButton onClick={handleChecked}>
                    <Checkbox
                            checked={checked}
                            tabIndex={-1}
                            />
                </IconButton>
            </DialogContentText>
            {checked && (
              <div>
                <DialogContentText style ={{float: 'inline-end'}}>
                <Button style ={{float: 'inline-end'}}variant="contained" startIcon={<AddIcon/>} onClick={handleAddCourse} size="small" aria-label="add" className='icon-margin'>
                  Add
                </Button>
                </DialogContentText>

                {substitutes.map((value, index) => {
            return (
                <ListItem
                    disablePadding
                >
                     <TextField
                      autoFocus
                      required
                      margin="dense"
                      id="subject"
                      name="subject"
                      label="Subject"
                      type="text"
                      variant="standard"
                      style ={{marginRight: '5%'}}
                      value = {value.subject}
                      onChange={(e) => handleCreditSubjectChange(e, index)}
                    />
                    <TextField
                      required
                      margin="dense"
                      id="course_number"
                      name="course number"
                      label="Course Number"
                      type="text"
                      variant="standard"
                      style ={{marginRight: '5%'}}
                      value = {value.course_number}
                      onChange={(e) => handleCreditcourse_numberChange(e, index)}
                    />
                    <TextField
                      required
                      margin="dense"
                      id="creditHours"
                      name="credit hours"
                      label="Credit Hours"
                      type="number"
                      variant="standard"
                      style ={{marginRight: '5%'}}
                      value = {value.credit_hours}
                      onChange={(e) => handleCreditCreditHourChange(e, index)}
                    />

                    <IconButton onClick={() => handleDeleteCourse(index)} size="large" aria-label="add" className='icon-margin'>
                      <DeleteOutlineOutlinedIcon/>
                    </IconButton>
                </ListItem>
            );
            })}
              </div>
              
        )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Submit</Button>
        </DialogActions>

      </Dialog>
    );
  }


function ClassList({year, category, title, classes}) {
    const [checked, setChecked] = React.useState([]);
    const [courses, setClasses] = React.useState(classes)
    const [numCredits, setNumCredits] = React.useState(0)
    const [open, setOpen] = React.useState(false)
    const [openDropdown, setOpenDropdown] = React.useState(false)

    const [openSnack, setOpenSnack] = React.useState(false);
    const [snackMessage, setSnackMessage] = React.useState('');
    const [snackSeverity, setSnackSeverity] = React.useState('');

    const handleCloseSnack = (event, reason) => {
        if (reason === 'clickaway') {
            return
        }

        setOpenSnack(false)
    }

    const handleEdit = async (value) => {
      console.log(JSON.stringify(value));
      //Need to open the pop up window with these values and then allow for it to change
      return value;
    }

    const handleDelete = async () => {
        const deleted = courses.filter((value, _) => checked.includes(value));
        const newClasses = courses.filter((value, _) => !checked.includes(value));
        try {
          for (const element of deleted) {
              const data = [{
                  year: parseInt(year),
                  subject: element.subject,
                  category: category,
                  course_number: String(element.course_number), //Course number isn't always a number so stored as a string
                  credit_hours: parseInt(element.credit_hours),
                  conc_eligible: element.concEligible,
                  passing_grade: element.passingGrade,
                  repeatable: element.repeatable === 0 ? false : true,
                  substitutes: element.substitutes ? element.substitutes : []
              }];
  
              const response = await axios.delete('/api/checksheet/delete', { data });

              setSnackMessage(`Successfully Deleted ${response.data.message}`)
              setSnackSeverity(`success`)
              setOpenSnack(true)

          }
      } catch (error) {
          // Handle errors, such as network errors or server errors
          console.error('Error deleting courses:', error);
          setSnackMessage(`Error Deleting Courses`)
          setSnackSeverity(`error`)
          setOpenSnack(true)
      }
        setClasses(newClasses);
        setChecked([]);
    }

    const handleSubmit = async (course) => {
      try{
        const data = {
          year: parseInt(year),
          subject: course.subject,
          category: category,
          course_number: String(course.course_number), //Course number isn't always a number so stored as a string
          credit_hours: parseInt(course.credit_hours),
          repeatable: course.checkedRepeatable,
          conc_eligible: course.concEligible,
          passing_grade: course.passingGrade,
          substitutes: course.substitutes
        }
        await axios.post('/api/checksheet/add', data)
        const updatedCourses = [...courses, {...data, substitutes:JSON.stringify(data["substitutes"])}];
        setClasses(updatedCourses);

        setSnackMessage(`Added New Course ${data.subject} ${data.course_number} For ${data.year}`)
        setSnackSeverity(`success`)
        setOpenSnack(true)
      }
      catch (error) {
        // Handle errors, such as network errors or server errors
        if(error.response?.data?.message.includes('Error: Duplicate entry')) {
          setSnackMessage(`Course Already Exists`)
        }
        else {
          setSnackMessage(`Error Adding Course`)
        }

        console.error('Error adding course:', error);
        setSnackSeverity(`error`)
        setOpenSnack(true)
      }
    };

    useEffect (() => {
      var creds = 0
      courses.forEach(element => {
        creds += Number(element.credit_hours)
      });

      setNumCredits(creds)
    }, [courses])

    const handleToggle = (value) => () => {
      const currentIndex = checked.indexOf(value);
      const newChecked = [...checked];
  
      if (currentIndex === -1) {
        newChecked.push(value);
      } else {
        newChecked.splice(currentIndex, 1);
      }
  
      setChecked(newChecked);
    };

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleOpenDropdown = () => {
    setOpenDropdown(!openDropdown);
  };
  

  return (
    <div className='class-table-list'>
        <Snackbar open={openSnack} autoHideDuration={5000} onClose={handleCloseSnack}>
            <Alert
                onClose={handleCloseSnack}
                severity={snackSeverity}
                sx={{ width: '100%' }}
            >
                {snackMessage}
            </Alert>
        </Snackbar>

        <div className='class-header' onClick={handleOpenDropdown}>
            <h2>{title}</h2>
            <div className='icon-wrapper'>
            <IconButton size='large' aria-label='toggle-dropdown'>
              {openDropdown ? (
                <ExpandLessIcon />
              ) : (
                <ExpandMoreIcon />
              )}
            </IconButton>
            </div>
        </div>
        <div>
          <h4 style ={{margin: '0', color: "gray"}}>Credits: {numCredits}</h4>
        </div>
        {openDropdown && (<>
        <div>
          <div className='icon-wrapper'>
                {!staticDemo && <IconButton onClick={handleClickOpen} size="large" aria-label="add" className='icon-margin'>
                    <AddCircleOutlineOutlinedIcon/>
                </IconButton>}
                {!staticDemo && <IconButton onClick={handleDelete} size="large" aria-label="delete">
                    <DeleteOutlineOutlinedIcon/>
                </IconButton>}
            </div>
        </div>
        <div>
            <List sx={{ width: '100%', bgcolor: 'background.paper', overflow: 'auto', maxHeight: 200}}>
                {courses.map((value) => {
            return (
                <ListItem
                    disablePadding
                    onClick={staticDemo ? undefined : handleToggle(value)}
                    key={`${value.subject}-${value.course_number}-${category}`}
                >
                     {!staticDemo && <IconButton disableRipple className='checkbox-item'>
                        <Checkbox
                        edge="start"
                        checked={checked.indexOf(value) !== -1}
                        tabIndex={-1}
                        disableRipple
                        />
                    </IconButton>}
                    <ListItemText 
                      primary={`${value.subject}${value.course_number} ${value.conc_eligible !== 'cs' ? `  (${value.conc_eligible} eligible)`: ''} [${value.passing_grade}]`}
                      secondary={(Array.isArray(value.substitutes) ? value.substitutes : []).map(sub => `${sub.subject}${sub.course_number}`).join(', ')}
                    />
                    {/*<IconButton onclick={handleEdit(value)} size="medium" aria-label="edit">
                      <EditOutlinedIcon/>
                    </IconButton>*/}
                </ListItem>
            );
            })}
            </List>
        </div></>)}
        <SimpleDialog
        open={open}
        onClose={handleClose}
        title = {title}
        onSubmit = {handleSubmit}
      />

    </div>
  )
}

export default ClassList
