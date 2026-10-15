import React, { useEffect, useState } from 'react';
import "../../css/Admin.css";
import axios from 'axios';
import Popup from '../HelperComponents/Popup';

const AdminPage = ({ CurrentUser }) => {
    const [addUserPopupOpen, setAddUserPopupOpen] = useState(false);
    const [editUserPopupOpen, setEditUserPopupOpen] = useState(false);
    const [confirmDeletePopupOpen, setConfirmDeletePopupOpen] = useState(false);
    const [selectedAccessLevel, setSelectedAccessLevel] = useState(null);
    const [editingUser, setEditingUser] = useState(null);
    const [addUserPID, setAddUserPID] = useState(null);
    const [deleteUser, setDeleteUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [addUserPermissions, setAddUserPermissions] = useState(0);
    const [addUserCampus, setAddUserCampus] = useState(0);
//    const [addUserRole, setAddUserRole] = useState('user');

    useEffect(() => {
        getUsers();
    }, []);

    const toggleDeletePopup = () => {
        setConfirmDeletePopupOpen(!confirmDeletePopupOpen);
        setDeleteUser(null);

    }

    const toggleEditPopup = () => {
        setEditUserPopupOpen(!editUserPopupOpen);
        setEditingUser(null);
        setSelectedAccessLevel(null);
    }


    const toggleAddUserPopup = () => {
        setAddUserPopupOpen(!addUserPopupOpen);
        setAddUserPID(null);
        setAddUserPermissions(0);
    }

    async function handleAddUser(userPID) {
        try {
            await axios.post("/api/user", {
                pid: userPID,
                permissions: addUserPermissions
            });
            getUsers();
            setAddUserPID(null);
            setAddUserPermissions(0);
            setAddUserPopupOpen(false);
        } catch (error) {
            if (error.response) {
                alert(`Error adding user${error.response?.data?.message
                    ? ': ' + error.response.data.message + '.'
                    : '. Please try again.'}`);
            } else if (error.request) {
                console.error('Got no response to request:', error.request);
                alert('Error adding user. Please try again.');
            } else {
                console.error('Error:', error.message)
                alert('Error adding user. Please try again.');
            }
        }
    };

    
    function handleDownloadLog(user) {
        axios.get(`/api/log/pid/${user.pid}`, {
            responseType: 'blob',
            //send timezone in query params
            params: {
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            }
        }).then((response) => {
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const date = new Date();
            const dateString = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}`;
            link.setAttribute('download', `${user.pid}-${dateString}.log`);
            document.body.appendChild(link);
            link.click();
        }).catch((error) => {
            if (error.response) {
                alert(`Error downloading log${error.response?.data?.message
                    ? ': ' + error.response.data.message + '.'
                    : '. Please try again.'}`);
            } else if (error.request) {
                console.error('Got no response to request:', error.request);
                alert('Error downloading log. Please try again.');
            } else {
                console.error('Error:', error.message)
                alert('Error downloading log. Please try again.');
            }
        });  
    };

    function handleDownloadAllLogs(){
        axios.get(`/api/log/all`, {
            responseType: 'blob',
            //send timezone in query params
            params: {
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            }
        }).then((response) => {
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const date = new Date();
            const dateString = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}`;
            link.setAttribute('download', `all-logs-${dateString}.log`);
            document.body.appendChild(link);
            link.click();
        }).catch((error) => {
            if (error.response) {
                alert(`Error downloading log${error.response?.data?.message
                    ? ': ' + error.response.data.message + '.'
                    : '. Please try again.'}`);
            } else if (error.request) {
                console.error('Got no response to request:', error.request);
                alert('Error downloading log. Please try again.');
            } else {
                console.error('Error:', error.message)
                alert('Error downloading log. Please try again.');
            }
        });  
    }

    

    async function handleDeleteUser(user) {
        try {
            await axios.delete(`/api/user/${user.pid}`);
            getUsers();
            setDeleteUser(null);
            setConfirmDeletePopupOpen(false);
        } catch (error) {
            if (error.response) {
                alert(`Error deleting user${error.response?.data?.message
                    ? ': ' + error.response.data.message + '.'
                    : '. Please try again.'}`);
            } else if (error.request) {
                console.error('Got no response to request:', error.request);
                alert('Error deleting user. Please try again.');
            } else {
                console.error('Error:', error.message)
                alert('Error deleting user. Please try again.');
            }
        }
    };

    async function getUsers() {
        try {
            const response = await axios.get("/api/user/all");
            setUsers(response.data.users);
        } catch (error) {
            if (error.response) {
                console.error('Error getting users:', error.response);
                alert(`Error getting users, \nContact an admin if this persists.`);
            } else if (error.request) {
                console.error('Got no response to request:', error.request);
                alert(`Error getting users, \nContact an admin if this persists.`);
            } else {
                console.error('Error:', error.message)
                alert(`Error getting users, \nContact an admin if this persists.`);
            }
            setUsers([]);
        }
    };

    async function handleConfirmEdit(user) {
        try {
            const body = { pid:user.pid, permissions: selectedAccessLevel };
            await axios.patch(`/api/user/${user.pid}`, body);
            getUsers();
            setEditingUser(null);
            setSelectedAccessLevel(null);
            setEditUserPopupOpen(false);
        } catch (error) {
            if (error.response) {
                alert(`Error updating user${error.response?.data?.message
                    ? ': ' + error.response.data.message + '.'
                    : '. Please try again.'}`);
            } else if (error.request) {
                console.error('Got no response to request:', error.request);
                alert('Error updating user. Please try again.');
            } else {
                console.error('Error:', error.message)
                alert('Error updating user. Please try again.');
            }
        }
    };


    const userLevels = [
        { value: 1, label: 'Advisor' }, //Advisor (1)
        { value: 3, label: 'Admin' }, //Admin (2) + Advisor (1) = 3
        { value: 7, label: 'UnderGradmin'}, ///UnderGraduate Coordinator(4) + Admin(2) + Advisor(1) = 7
        { value: 11, label: 'Gradmin'} //Graduate Coordinator(8) + Admin(2) + Advisor(1) = 11
    ];

    return (
        <div className="admin-page">
        <h1>Admin Page</h1>
        <div className="admin-header">
            <h2>Users</h2>
            <div className='buttons'>
                <button onClick={toggleAddUserPopup}>Add User</button>
                <button onClick={handleDownloadAllLogs}>Download All Logs</button>
            </div>
        </div>
        <div>
            {users.length > 0 && users.map((user, index) => (
                <div className="user" key={index}>
                    <p>{user.pid} ({
                        ((user.permissions & 8) == 8) ? "Gradmin":
                        ((user.permissions & 4) == 4) ? "UnderGradmin":
                        ((user.permissions & 2) == 2) ? "Admin":
                        ((user.permissions & 1) == 1) ? "Advisor":
                        "student"
                        })</p>
                    <div>
                        {CurrentUser.pid !== user.pid &&
                            <>
                                <button onClick={() => {
                                    setEditingUser(user);
                                    setSelectedAccessLevel(user.permissions);
                                    setEditUserPopupOpen(true);
                                }}>Edit Access</button>
                                <button onClick={() => {
                                    setDeleteUser(user);
                                    setConfirmDeletePopupOpen(true);
                                }}>Delete User</button>
                            </>
                        }
                        <button onClick={() => handleDownloadLog(user)}>Download Log</button>
                    </div>
                </div>
            ))}
        </div>
        {editUserPopupOpen && <Popup
            content={
                <>
                    <b>Edit User Type for user: {editingUser.pid}</b>
                    <br />
                    <div className="radio-container">
                        {userLevels.map((option, index) => (
                            <div key={index} className="radio-option">
                                <input
                                    type="radio"
                                    id={option.value}
                                    name="accessLevel"
                                    value={option.value}
                                    defaultChecked={option.value === selectedAccessLevel}
                                    onChange={(event) => {
                                        setSelectedAccessLevel(event.target.value);
                                    }}
                                />
                                <label htmlFor={option.value}>{option.label}</label>
                            </div>
                        ))}
                    </div>
                    <br />
                    <div className="confirm-button-container">
                        <button onClick={() => handleConfirmEdit(editingUser)}>Confirm</button>
                    </div>
                </>
            }
            handleClose={toggleEditPopup}
        />}
        {addUserPopupOpen && <Popup
            content={
                <>
                    <b>Add User</b>
                    <br />
                    <div className="input-container">
                        <input type="text" placeholder="Enter user's VT PID"
                            onChange={e => setAddUserPID(e.target.value)} />
                    </div>
                    <br />
                    <div className='add-user-permissions-container'>
                        <b>Select User Permissions:</b>

                    </div>
                    <div className="radio-container-horizontal">
                        {userLevels.map((option, index) => (
                            <div key={index} className="radio-option-horizontal">
                                <input
                                    type="radio"
                                    id={option.value}
                                    name="accessLevel"
                                    value={option.value}
                                    defaultChecked={option.value === addUserPermissions}
                                    onChange={(event) => {
                                        setAddUserPermissions(event.target.value);
                                    }}
                                />
                                <label htmlFor={option.value}>{option.label}</label>
                            </div>
                        ))}
                    </div>
                    <div class="confirm-button-container">
                        <button onClick={() => handleAddUser(addUserPID)}>Confirm</button>
                    </div>
                </>
            }
            handleClose={toggleAddUserPopup}
        />}
        {confirmDeletePopupOpen && <Popup
            content={
                <>
                    <b>Confirm Delete User</b>
                    <br />
                    <div className="input-container">
                        <p>Are you sure you want to delete user <strong>{deleteUser.pid}</strong>?</p>
                    </div>
                    <div class="confirm-button-container">
                        <button onClick={() => toggleDeletePopup()}>Cancel</button>
                        <button className="confirm-button"
                            onClick={() => handleDeleteUser(deleteUser)}>Confirm</button>
                    </div>
                </>
            }
            handleClose={toggleDeletePopup}
        />}
        </div>
    );
};


export default AdminPage;