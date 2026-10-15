# Contents <!-- omit in toc -->
- [Overview](#overview)
- [Deployment](#deployment)
- [Notes](#notes)

# Overview
The Student Advising Application for Computer Science (SAACS) is an expanding suite of tools for assistance in CS student advising. It is the combined work of multiple student groups writing and rewriting the various applications over multiple semesters. Currently it contains the following functionality:
* Policy 91 Violation Checking
* Progress Towards Degree Checking
* Force Add Applications for Undergraduate Courses
* Force Add Applications for Graduate Courses

And there are currently plans to add the following additional functionality:
* IMPROVED Progress Towards Degree Checking
* Graduate Student Activity Reports (SARs)
* Graduate Plan of Study (PoS)

# Deployment
Generally speaking, all of the information you'll need can be found in the [Docker Example Site](https://docker-example.discovery.cs.vt.edu/). You also get the lovely helper scripts [`makeback.sh`](/makeback.sh), [`makefront.sh`](/makefront.sh), and [`makeemailer.sh`](/makeemailer.sh) though you'll need to change the [`VERSION`](/VERSION) file and registry URLs with those of your own repository. Make sure your repository is marked as private and add your registry credentials before attempting to deploy your frontend or backend.
## Secrets
| Key | Description |
| -   | -           |
| MYSQL_DATABASE | The name of a database to be created on image startup. |
| MYSQL_ROOT_PASSWORD | The password that will be set for the MySQL root superuser account. DO NOT GIVE YOUR APPLICATION ROOT ACCESS! |
| MYSQL_HOST | The hostname for the MySQL database (in this case the name of your workload) |
| MYSQL_USER | The username for your application user which will be granted superuser access to the database created on image startup |
| MYSQL_PASSWORD | The password for your application user which will be granted superuser access to the database created on image startup |

## Database
For this project I would recommend the use of the [mysql](https://hub.docker.com/_/mysql) image as it natively supports the JSON type (I know JSONs in MySQL is a "sin", but that's what the student group used for the checksheet, feel free to make it a separate table). For the environmental variables you can add the whole secret above as a 'Secret' type with no prefix. You will also likely want to setup a persistent volume to maintain your database between restarts. Once this is running, you can use the [Database Dump](/database/init.sql) to populate it with the required tables and rows.

## Adminer
This is a SUPER handy database GUI that you can use rather than the CLI granted by the database deployment. Instructions for this are included in the example site.

## Backend
You'll need to use port 5000 for your ClusterIP service and provide the following Environment Variables.
| Name | Description |
| - | - |
| INIT_ADMIN | Flag indicating whether the backend workload should automatically insert an admin of PID `INIT_ADMIN_PID` when the backend server starts. A nonzero value (e.g. "1") indicates that the admin should be added, while a value of "0" will prevent this admin from being created on server startup.|
| INIT_ADMIN_PID | The PID (i.e. "\<PID\>@vt.edu") of the admin that should be added to the list of allowed users when the backend server starts. Insertion is contingent on `INIT_ADMIN` being a nonzero value.|
| SITE_URL | The full URL (e.g. "https://saacs.discovery.cs.vt.edu") of the website, where the URL after "https://" matches the value of `Request Host` in your Ingress resource. Must start with `https` or CAS Authentication will reject you.|
| PORT | The port the backend will listen to for HTTP requests. Should be the value `5000`. |
| MAIL_USER | Should be the value `peongrad`. |
| MAIL_PASSWORD | Should be the value `Hokies10!`. |
| MYSQL_HOST **(secrets)** | Just load this as a `Secret key` type using the Database Secret created earlier where the `Variable Name` matches the key.|
| MYSQL_USER **(secrets)** | Just load this as a `Secret key` type using the Database Secret created earlier where the `Variable Name` matches the key.|
| MYSQL_PASSWORD **(secrets)** | Just load this as a `Secret key` type using the Database Secret created earlier where the `Variable Name` matches the key.|
| MYSQL_DATABASE **(secrets)** | Just load this as a `Secret key` type using the Database Secret created earlier where the `Variable Name` matches the key.|

## Frontend
You'll need to use port 3000 for your ClusterIP service and provide the following Environment Variables.
| Name | Description |
| - | - |
| REACT_PORT | The port the frontend will listen to for HTTP requests. Should be the value `3000`. |
| SITE_URL | The full URL (e.g. "https://saacs.discovery.cs.vt.edu") of the website, where the URL after "https://" matches the value of `Request Host` in your Ingress resource. Must start with `https` or CORS will reject your backend communications. |

## Emailer
You probably won't need to deploy this, unless you've got some timed events you want run. You'll need to provide the following Environment Variables.
| Name | Description |
| - | - |
| job | The `job` to be run as defined within the [`emailer`](/emailer/ugrad-emailer.py) file. Do not run the `ugrad` or `grad` jobs as those are reserved for the Force Add Applications |
| dbhost **(secrets)** | This is the MYSQL_HOST secret. Just load this as a `Secret key` type using the Database Secret created. |
| dbuser **(secrets)** | This is the MYSQL_USER secret. Just load this as a `Secret key` type using the Database Secret created. |
| dbpass **(secrets)** | This is the MYSQL_PASSWORD secret. Just load this as a `Secret key` type using the Database Secret created. |
| dbname **(secrets)** | This is the MYSQL_DATABASE secret. Just load this as a `Secret key` type using the Database Secret created. |

# Notes
As you can see, there is a different file called [oldREADME.md](/oldREADME.md) which was this projects original README file, but most of the information it contains is either outdated or repeated here, but I kept it for posterities sake. In addition, there is another file called [Reasoning.md](/Reasoning.md) which was an addition from a later team and may still be worth taking a look at. If you need to run any scheduled jobs, feel free to add them to the `emailer`, but do not run the `ugrad` or `grad` jobs. Please do not mess with the `ttupdater` functionality or run it's accompanying `makett.sh` script, the system that interacts with has strict rate limiting and we'll be kicked off if we abuse it.

This project is large and does have some leftover non-functional code as well as features that need to be rewritten (looking at you Progress Towards Degree). But if you take your time and poke around, you'll find plenty of examples of code that will help you better understand the general workflow and the accursed "ORM".

I warn you now, this project will not work if run locally due to the CAS login functionality, but feel free to try and implement a workaround. It's not something I've ever had to do as a solo developer but I'm sure it would be a great help for any future teams on this project or working with the same stack.

Lastly, if you have any questions, concerns, or problems please feel free to reach out to me at [bbradner@vt.edu](mailto:bbradner@vt.edu).