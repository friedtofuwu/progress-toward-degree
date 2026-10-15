import mysql.connector
import requests
import json
from os import environ


print("[SYSTEM] Connecting to Database")
mydb = mysql.connector.connect(
    host=environ.get("db_host","saacs-testdb"),
    user=environ.get("db_user","saacs-user"),
    password=environ.get("db_password","P33^hJ!E6YpyVq86"),
    database=environ.get("db_database","saacs-db")
)
mycursor = mydb.cursor()
print("[SYSTEM] Connected to Database")


print("[SYSTEM] Requesting Timetable JSON")
url = "https://resources.pamplin.vt.edu/website_assets/data-files/currentTimetableALL.json"
#"https://invtest.endeavour.cs.vt.edu/app/view/timetable.json"
r = requests.get(url, allow_redirects=True)
print("[SYSTEM] Recieved Timetable JSON, converting to List of Dictionaries")
tt = json.loads(r.content)

print("[SYSTEM] Looping through List to isolate CS courses")
#Apparently a TERM + CRN can repeat with a different primary... so need to prevent that

csd = {}
for n in tt:
    if n["COURSE"][0] == "C" and n["COURSE"][1] == "S" and n["COURSE"][2] == " ":
        if n["TERMCODE"]+n["CRN"] not in csd:
            csd[n["TERMCODE"]+n["CRN"]] = ((
                int(n["TERMCODE"]),
                int(n["CRN"]),
                n["COURSE"],
                n["COURSE_TITLE"],
                int(n["LOW_CREDIT_HRS"]), #n["HIGH_CREDIT_HRS,
                n["INSTRUCTOR_UID"],
                n["MEETDAYS"],
                0 if n["BEGIN_TIME"] is None else int(n["BEGIN_TIME"]),
                0 if n["END_TIME"] is None else int(n["END_TIME"]),
                n["LOCATION"],
                int(n["CAMPUS"]),
                int(n["CURRENT_ENROLLMENT"]),
                int(n["MAX_ENROLLMENT"]),
                0
            ))
print("[SYSTEM] Inserting "+str(len(csd))+" sections into NewTimetable")
mycursor.executemany("INSERT INTO NewTimetable (termcode, crn, course_id, course_name, credit_hrs, instructor, meet_days, begin_time, end_time, location, campus, current_enrollment, max_enrollment, active) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",list(csd.values()))
mydb.commit()
print("[SYSTEM] Successfully inserted sections, calling UpdateTimeTable")
mycursor.callproc("UpdateTimeTable")
print("[SYSTEM] Completed UpdateTimeTable Call")
print("[SYSTEM] Timetable Updated!")