import os
import smtplib
import ssl
import mysql.connector
import email

from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr

from datetime import datetime, timedelta

smtp_server = "smtp.cs.vt.edu"
smtp_port = 465
context = ssl.create_default_context()
sender_email = os.environ.get("sender-email")
sender_username = os.environ.get("sender-username")
sender_password = os.environ.get("sender-password")

d = datetime.today() - timedelta(hours=0, minutes=50)

def getDBConn():
    return mysql.connector.connect(
        host = os.environ.get("dbhost","saacs-testdb"),
        user = os.environ.get("dbuser","root"),
        password = os.environ.get("dbpass","toor"),
        database = os.environ.get("dbname","saacs-db")
    )

def readableTimeStamp(t):
    #t = t-timedelta(hours=4)
    return t.strftime("%I:%M%p %b %d %Y")

def readableTerm(t):
    term = "Summer "
    if(t % 100 == 1):
        term = "Spring "
    elif(t % 100 == 9):
        term = "Fall "
    return term+str(int(t/100))+" ("+str(t)+")"

def ugrad_emailer():
    # setup db connection
    mydb = getDBConn()
    mycursor = mydb.cursor()
    # handle pending that should be waitlists
    mycursor.callproc("UgradFAWaitlist")
    # call to get denials and waitlists
    mycursor.execute(
        """
        SELECT forceadd_id, pid, term, course_id, external_comments, status, status_timestamp
        FROM UG_ForceAdd
        WHERE
            (status = 2 OR status = 4 OR status = 5 OR status = 6) AND
            (course_id LIKE "CS 1%" OR course_id LIKE "CS 2%" OR course_id LIKE "CS 3%" OR course_id LIKE "CS 4%") AND
            emailed = 0
        ;
        """,
        []
    )
    # get the results
    submissions = mycursor.fetchall()
    if len(submissions) == 0:
        print("[SYSTEM] No Undergrad Denials or Waitlists to Report")
        mycursor.close()
        mydb.close()
        return
    keys = [] # list of key match statements for update
    # connect to the email server
    try:
        with smtplib.SMTP("mailrelay.smtp.vt.edu", 25) as server:
            # loop through each
            for s in submissions:
                requestID,studentPID,term,course_id,external_comments,status,timestamp = s #unpack the submission
                message = MIMEMultipart()
                message["From"] = formataddr(("csundergrad",'csundergrad@vt.edu'))
                message["To"] = studentPID+"@vt.edu"
                message["Subject"] = "Re: Force/Add Request "+str(requestID)
                if(status == 4): # create denial body
                    etext = f"""
                        Your Force/Add Request {requestID} was Denied at {readableTimeStamp(timestamp)}.\n
                        You are not eligible to resubmit your request at this time. If you feel there was some sort of error and would like to reach out to us, we can be reached at csundergrad@vt.edu\n
                        To view your submitted request and the reason for your denial please go to https://saacs.endeavour.cs.vt.edu/ug/forceadd/{requestID}
                    """
                    #message.attach(MIMEText(etext, 'plain'))
                    ehtml = f"""
                        <p>Your Force/Add Request was Denied at {readableTimeStamp(timestamp)}.</p>
                        <ul style="list-style-type:none;">
                            <li>Term: {readableTerm(term)}</li>
                            <li>Course ID: {course_id}</li>
                            <li>Comments: {external_comments}</li>
                        </ul>
                        <p>You are not eligible to resubmit your request at this time. If you feel there was some sort of error and would like to reach out to us, we can be reached at <a href="mailto:csundergrad@vt.edu">csundergrad@vt.edu</a>.</p>
                        <p>To view your submitted request please go to <a href="https://saacs.endeavour.cs.vt.edu/ug/forceadd/{requestID}" title="Your Force/Add Request">https://saacs.endeavour.cs.vt.edu/ug/forceadd/{requestID}</a>.</p>
                    """
                    message.attach(MIMEText(ehtml, 'html'))
                elif(status == 2): # create waitlist body
                    etext = f"""
                        Your Force/Add Request {requestID} was Waitlisted at {readableTimeStamp(timestamp)}.\n
                        This is likely a result of the sections you requested already being full in which case if seats open up an advisor will attempt to add you then.\n
                        There is no guarantee that an advisor will be able to add you before the section fills back up so it is still your responsibilty to keep an eye out for openings.\n
                        If you do manage to get a seat on your own or otherwise no longer need to be force added, please cancel your request so you are not inadvertently moved to a different section.\n
                        You are not eligible to resubmit your request at this time. If you feel there was some sort of error and would like to reach out to us, we can be reached at csundergrad@vt.edu\n
                        To view your submitted request and the reason for your denial please go to https://saacs.endeavour.cs.vt.edu/ug/forceadd/{requestID}
                    """
                    #message.attach(MIMEText(etext, 'plain'))
                    ehtml = f"""
                        <p>Your Force/Add Request was Waitlisted at {readableTimeStamp(timestamp)}.</p>
                        <ul style="list-style-type:none;">
                            <li>Term: {readableTerm(term)}</li>
                            <li>Course ID: {course_id}</li>
                            <li>Comments: {external_comments}</li>
                        </ul>
                        <p>This is likely a result of the sections you requested already being full in which case if seats open up an advisor will attempt to add you then.</p>
                        <p>There is no guarantee that an advisor will be able to add you before the section fills back up so it is still your responsibilty to keep an eye out for openings.</p>
                        <p>If you do manage to get a seat on your own or otherwise no longer need to be force added, please cancel your request so you are not inadvertently moved to a different section.</p>
                        <p>You are not eligible to resubmit your request at this time. If you feel there was some sort of error and would like to reach out to us, we can be reached at <a href="mailto:csundergrad@vt.edu">csundergrad@vt.edu</a>.</p>
                        <p>To view your submitted request please go to <a href="https://saacs.endeavour.cs.vt.edu/ug/forceadd/{requestID}" title="Your Force/Add Request">https://saacs.endeavour.cs.vt.edu/ug/forceadd/{requestID}</a>.</p>
                    """
                    message.attach(MIMEText(ehtml, 'html'))
                elif(status == 5): # create missing prereqs body
                    etext = f"""
                        Your Force/Add Request {requestID} was Denied at {readableTimeStamp(timestamp)} for Missing Prerequisites.\n
                        You are not eligible to resubmit your request at this time. If you feel there was some sort of error and would like to reach out to us, we can be reached at csundergrad@vt.edu\n
                        To view your submitted request and the reason for your denial please go to https://saacs.endeavour.cs.vt.edu/ug/forceadd/{requestID}
                    """
                    #message.attach(MIMEText(etext, 'plain'))
                    ehtml = f"""
                        <p>Your Force/Add Request was Denied at {readableTimeStamp(timestamp)} for Missing Prerequisites.</p>
                        <ul style="list-style-type:none;">
                            <li>Term: {readableTerm(term)}</li>
                            <li>Course ID: {course_id}</li>
                            <li>Comments: {external_comments}</li>
                        </ul>
                        <p>You are not eligible to resubmit your request at this time. If you feel there was some sort of error and would like to reach out to us, we can be reached at <a href="mailto:csundergrad@vt.edu">csundergrad@vt.edu</a>.</p>
                        <p>To view your submitted request please go to <a href="https://saacs.endeavour.cs.vt.edu/ug/forceadd/{requestID}" title="Your Force/Add Request">https://saacs.endeavour.cs.vt.edu/ug/forceadd/{requestID}</a>.</p>
                    """
                    message.attach(MIMEText(ehtml, 'html'))
                elif(status == 6): # create class full body
                    etext = f"""
                        Your Force/Add Request {requestID} was Denied at {readableTimeStamp(timestamp)} because your chosen class/sections were full.\n
                        You are not eligible to resubmit your request at this time. If you feel there was some sort of error and would like to reach out to us, we can be reached at csundergrad@vt.edu\n
                        To view your submitted request and the reason for your denial please go to https://saacs.endeavour.cs.vt.edu/ug/forceadd/{requestID}
                    """
                    #message.attach(MIMEText(etext, 'plain'))
                    ehtml = f"""
                        <p>Your Force/Add Request was Denied at {readableTimeStamp(timestamp)}.</p>
                        <p>This request has been denied as there are no available seats in the course or CRN that you requested at the time of review. As the request cannot be processed, you are not eligible to resubmit your request for this course at this time.</p>
                        <p>We recommend that you continue to monitor the timetable to determine if a seat becomes available and enroll as we will not monitor the system for open seats.</p>
                        <p>If you feel there was some sort of error and would like to reach out to us, please respond to this email.</p>
                        <p>To view your submitted request please go to <a href="https://saacs.endeavour.cs.vt.edu/ug/forceadd/{requestID}" title="Your Force/Add Request">https://saacs.endeavour.cs.vt.edu/ug/forceadd/{requestID}</a>.</p>
                    """
                    message.attach(MIMEText(ehtml, 'html'))
                # actually send the email
                try:
                    server.sendmail("csundergrad@vt.edu",studentPID+"@vt.edu",message.as_string())
                except Exception as e:
                    print(f"[ERROR] Failed to send status email for {requestID}: {e}")
                else:
                    print(f"[SYSTEM] Sent status email for {requestID}")
                    keys.append(requestID)
    except Exception as e:
        print(f"[ERROR] Failed to connect with SMTP relay: {e}")
        mycursor.close()
        mydb.close()
        return
    #Mark them all as being emailed
    if len(keys) > 0: # Nothing to update if it didn't send anything
        stmt = "UPDATE UG_ForceAdd SET emailed = 1 WHERE "
        for x in range(0,len(keys)):
            if x != 0:
                stmt += " OR"
            stmt += " forceadd_id = %s"
        else:
            stmt += ";"
        mycursor.execute(stmt, keys)
        mydb.commit()
        print(f"[SYSTEM] Updated emailed flag for {mycursor.rowcount} rows") 
    print(f"[SYSTEM] Handled {len(keys)}/{len(submissions)} Denials and Waitlistings for Undergrad")
    #close the db connection before ending
    mycursor.close()
    mydb.close()
    return

def grad_emailer():
    # setup db connection
    mydb = getDBConn()
    mycursor = mydb.cursor()
    # handle pending that should be waitlists
    mycursor.callproc("GradFAWaitlist")
    # call to get denials and waitlists
    mycursor.execute(
        """
        SELECT forceadd_id, pid, term, course_id, external_comments, status, status_timestamp
        FROM Grad_ForceAdd
        WHERE
            (status = 2 OR status = 4 OR status = 5 OR status = 6) AND
            (course_id LIKE "CS 5%" OR course_id LIKE "CS 6%" OR course_id LIKE "CS 7%" OR course_id LIKE "CS 8%") AND
            emailed = 0 AND
            status_timestamp < DATE_SUB(NOW(), INTERVAL '1' HOUR)
        ;
        """,
        []
    )
    # get the results
    submissions = mycursor.fetchall()
    if len(submissions) == 0:
        print("[SYSTEM] No Grad Denials or Waitlists to Report")
        mycursor.close()
        mydb.close()
        return
    keys = [] # list of key match statements for update
    # connect to the email server
    try:
        with smtplib.SMTP_SSL("smtp.cs.vt.edu", 465, context=context) as server:
            try:
                server.login(sender_username, sender_password) #login
            except Exception as e:
                print(f"[ERROR] Failed to log into SMTP relay: {e}")
                mycursor.close()
                mydb.close()
                return
            # loop through each submission
            for s in submissions:
                requestID,studentPID,term,course_id,external_comments,status,timestamp = s #unpack the submission
                message = MIMEMultipart()
                message["From"] = formataddr(("gradinfo",'gradinfo@cs.vt.edu'))
                message["To"] = studentPID+"@vt.edu"
                message["Subject"] = "Re: Force/Add Request "+str(requestID)
                if(status == 4): # create denial body
                    etext = f"""
                        Your Force/Add Request {requestID} was Denied at {readableTimeStamp(timestamp)}.\n
                        You are not eligible to resubmit your request at this time. If you feel there was some sort of error and would like to reach out to us, please respond to this email.\n
                        To view your submitted request and the reason for your denial please go to https://saacs.endeavour.cs.vt.edu/grad/forceadd/{requestID}
                    """
                    #message.attach(MIMEText(etext, 'plain'))
                    ehtml = f"""
                        <p>Your Force/Add Request was Denied at {readableTimeStamp(timestamp)}.</p>
                        <ul style="list-style-type:none;">
                            <li>Term: {readableTerm(term)}</li>
                            <li>Course ID: {course_id}</li>
                            <li>Comments: {external_comments}</li>
                        </ul>
                        <p>You are not eligible to resubmit your request at this time. If you feel there was some sort of error and would like to reach out to us, please respond to this email.</p>
                        <p>To view your submitted request please go to <a href="https://saacs.endeavour.cs.vt.edu/grad/forceadd/{requestID}" title="Your Force/Add Request">https://saacs.endeavour.cs.vt.edu/grad/forceadd/{requestID}</a>.</p>
                        <p>The Graduate Force Add Request will close on Thursday, August 28 at 11:59PM</p>
                    """
                    message.attach(MIMEText(ehtml, 'html'))
                elif(status == 2): # create waitlist body
                    etext = f"""
                        Your Force/Add Request {requestID} was Waitlisted at {readableTimeStamp(timestamp)}.\n
                        This is likely a result of the sections you requested already being full in which case if seats open up an advisor will attempt to add you then.\n
                        There is no guarantee that an advisor will be able to add you before the section fills back up so it is still your responsibilty to keep an eye out for openings.\n
                        If you do manage to get a seat on your own or otherwise no longer need to be force added, please cancel your request so you are not inadvertently moved to a different section.\n
                        You are not eligible to resubmit your request at this time. If you feel there was some sort of error and would like to reach out to us, please respond to this email.\n
                        To view your submitted request and the reason for your denial please go to https://saacs.endeavour.cs.vt.edu/grad/forceadd/{requestID}
                    """
                    #message.attach(MIMEText(etext, 'plain'))
                    ehtml = f"""
                        <p>Your Force/Add Request was Waitlisted at {readableTimeStamp(timestamp)}.</p>
                        <ul style="list-style-type:none;">
                            <li>Term: {readableTerm(term)}</li>
                            <li>Course ID: {course_id}</li>
                            <li>Comments: {external_comments}</li>
                        </ul>
                        <p>This is likely a result of the sections you requested already being full in which case if seats open up an advisor will attempt to add you then.</p>
                        <p>There is no guarantee that an advisor will be able to add you before the section fills back up so it is still your responsibilty to keep an eye out for openings.</p>
                        <p>If you do manage to get a seat on your own or otherwise no longer need to be force added, please cancel your request so you are not inadvertently moved to a different section.</p>
                        <p>You are not eligible to resubmit your request at this time. If you feel there was some sort of error and would like to reach out to us, please respond to this email.</p>
                        <p>To view your submitted request please go to <a href="https://saacs.endeavour.cs.vt.edu/grad/forceadd/{requestID}" title="Your Force/Add Request">https://saacs.endeavour.cs.vt.edu/grad/forceadd/{requestID}</a>.</p>
                        <p>The Graduate Force Add Request will close on Thursday, August 28 at 11:59PM</p>
                    """
                    message.attach(MIMEText(ehtml, 'html'))
                elif(status == 5): # create missing prereqs body
                    etext = f"""
                        Your Force/Add Request {requestID} was Denied at {readableTimeStamp(timestamp)} for Missing Prerequisites.\n
                        You are not eligible to resubmit your request at this time. If you feel there was some sort of error and would like to reach out to us, please respond to this email.\n
                        To view your submitted request and the reason for your denial please go to https://saacs.endeavour.cs.vt.edu/grad/forceadd/{requestID}
                    """
                    #message.attach(MIMEText(etext, 'plain'))
                    ehtml = f"""
                        <p>Your Force/Add Request was Denied at {readableTimeStamp(timestamp)} for Missing Prerequisites.</p>
                        <ul style="list-style-type:none;">
                            <li>Term: {readableTerm(term)}</li>
                            <li>Course ID: {course_id}</li>
                            <li>Comments: {external_comments}</li>
                        </ul>
                        <p>You are not eligible to resubmit your request at this time. If you feel there was some sort of error and would like to reach out to us, please respond to this email.</p>
                        <p>To view your submitted request please go to <a href="https://saacs.endeavour.cs.vt.edu/grad/forceadd/{requestID}" title="Your Force/Add Request">https://saacs.endeavour.cs.vt.edu/grad/forceadd/{requestID}</a>.</p>
                        <p>The Graduate Force Add Request will close on Thursday, August 28 at 11:59PM</p>
                    """
                    message.attach(MIMEText(ehtml, 'html'))
                elif(status == 6): # create class full body
                    etext = f"""
                        Your Force/Add Request {requestID} was Denied at {readableTimeStamp(timestamp)} because your chosen class/sections were full.\n
                        You are not eligible to resubmit your request at this time. If you feel there was some sort of error and would like to reach out to us, please respond to this email.\n
                        To view your submitted request and the reason for your denial please go to https://saacs.endeavour.cs.vt.edu/grad/forceadd/{requestID}
                    """
                    #message.attach(MIMEText(etext, 'plain'))
                    ehtml = f"""
                        <p>Your Force/Add Request was Denied at {readableTimeStamp(timestamp)} because your chosen class/sections were full.</p>
                        <p>This request has been denied as there are no available seats in the course or CRN that you requested at the time of review. As the request cannot be processed, you are not eligible to resubmit your request for this course at this time.</p>
                        <p>We recommend that you continue to monitor the timetable to determine if a seat become available and enroll as we will not monitor the system for open seats.</p>
                        <p>If you feel there was some sort of error and would like to reach out to us, please respond to this email.</p>
                        <p>To view your submitted request please go to <a href="https://saacs.endeavour.cs.vt.edu/grad/forceadd/{requestID}" title="Your Force/Add Request">https://saacs.endeavour.cs.vt.edu/grad/forceadd/{requestID}</a>.</p>
                        <p>The Graduate Force Add Request will close on Thursday, August 28 at 11:59PM</p>
                    """
                    message.attach(MIMEText(ehtml, 'html'))
                # actually send the email
                try:
                    server.sendmail('gradinfo@cs.vt.edu',studentPID+"@vt.edu",message.as_string())
                except Exception as e:
                    print(f"[ERROR] Failed to send status email for {requestID}: {e}")
                else:
                    print(f"[SYSTEM] Sent status email for {requestID}")
                    keys.append(requestID)
    except Exception as e:
        print(f"[ERROR] Failed to connect with SMTP relay: {e}")
        mycursor.close()
        mydb.close()
        return
    #Mark them all as being emailed
    if len(keys) > 0: # Nothing to update if didn't send anything
        stmt = "UPDATE Grad_ForceAdd SET emailed = 1 WHERE "
        for x in range(0,len(keys)):
            if x != 0:
                stmt += " OR"
            stmt += " forceadd_id = %s"
        else:
            stmt += ";"
        mycursor.execute(stmt, keys)
        mydb.commit()
        print(f"[SYSTEM] Updated emailed flag for {mycursor.rowcount} rows") 
    print(f"[SYSTEM] Handled {len(keys)}/{len(submissions)} Denials and Waitlistings for Grad")
    #close the db connection before ending
    mycursor.close()
    mydb.close()
    return

def morning_summary():
    # get stats for grad
    # send numbers to grad office
    # get stats for undergrad
    # send numbers to undergrad office
    return

match os.getenv("job","none"):
    case "ugrad":
        ugrad_emailer()
    case "grad":
        grad_emailer()
    case "morning":
        morning_summary()
    case _:
        print('No "job" provided')