# Good Luck Have Fun!

>  'Myself acquainted with misfortune, I learn to help the unfortunate.' - Virgil

Greetings you unfortunate souls who have inherited this codebase and welcome to the nightmare. My name is `gogura` or `GryphNdor` and I am authoring this article because I was the tech lead of the previous team and I have spent approximately *79 hours* with this codebase. Originally I was going to draft more professional ADRs for this project but I think that a more lighthearted approach to documenting this project is more interesting and maybe insightful.

Since I assume you value your time and plan on having a life, here is a list of expectations and potential horrors you will find in this codebase. Some of which are truly coding sins and should be shamed on [r/programminghorror](https://www.reddit.com/r/programminghorror/) 

I am also leaving you some reasoning about what my team did and why we made these decisions. So you have some insight into our thought process outside of just comments explaining what the code does

## What We Were Given

It is difficult to describe what our team did without first highlighting what we were given. Frankly, it was a miracle this thing even worked in the first place
### JavaScript 🤢

Ok, ok, I didnt think that this was a bad issue when we first started this project. In fact one of my teammate suggested that we transition to TypeScript for this project but I shot that idea down. 

If you value having your code editor do error checks or some level of intellisense, tough luck. Furthermore the process of testing this project goes `docker build --> docker push --> redeploy on cs.cloud` which takes roughly 15 seconds. The issues is that since this is JavaScript error that normally are caught in compile time such as variables not being called, typos, or const assignments appear in runtime! Which means another 15 seconds to redeploy, multiply that by 10 and you have spent about 2 minutes deploying just to test if the code prints to a point without crashing

A real pain in the ass which I will tell you what we did to "fix" this issue (kinda). 
### A Custom ORM (kinda?) and Logger

Debugging is probably the worst part about this codebase. Mainly because there isnt a local environment (VT CAS prevents you) to test your code with, which also means no debugger. Your best friend will be `console.log` which is easier to use than their Logger which logs it to the database and to the console. 

![[./diagrams/try-catch.png]]

There are also a ton of try-catches and they all look like ^. Also sometimes they use try-catch and other times it is the await-then syntax, we preferred the try-catch syntax more because it makes returning easier

Additionally there is a pseudo ORM. An ORM is a utility to make SQL queries more elegant and easy for example [TypeORM](https://typeorm.io/). Yea... this ORM (`node/database/handler`) does not do that. Mainly I had to write a lot of the SQL statements myself and just utilized the query function
### Manual JavaScript Joins

There  were no `JOIN` queries before our team took it. So you get code like this:
![[./diagrams/getAll.png]]
Where data is hand-stitched together in an unholy mess. Here is same code (except the Flags) using Joins:

![[./diagrams/join.png]]
### A Multithreaded Worker Lock (Yes... in JavaScript)
![[./diagrams/worker.png]]
*Someone loved P2 a little bit too much*. Basically they used this to handle inserts and processing data to the database. 

Why they did this? I dont know! It was undocumented! 🥳

This worker code permeates itself throughout the entire codebase! So if you happen to see a `importInfo` or some whack ass variable that Ben didnt clean up thats where is comes from and it does absolutely nothing, thats the reason
## Weird File Names

There are some strange file names included in this repository. File names that are "Repositories" to the database begin with capital letters and logic are lowercased
## What We Did

### Checksheet

Our main objective for this project was the creation of a check sheet to allow for the CS Advisors to input new classes for each school year. We then compare the student's classes against the sheet to grab missing courses that a student needs in order to graduate

In order to do that the majority of the work was done in these files:
* Parser.js (node/database/utils/Parser)
* parser.js (node/parser/parser) 
* spreadsheet.js (node/parser/spreadsheet)
* submission.import-worker.js (node/api/submission)
* Checksheet files
* React files

We had to edit the parsing and spreadsheet logic in order to enable the ability to get the additional student information 

In parser, there are a series of massages to convert the JS notation to database notion. This is done intentionally even if it doesn't do anything in the upload scripts. It makes it easier to upload a future field using `{field_name}` notation instead of `field_name: fieldName`

Another weird thing is couple JSON fields in the SQL table. Although I agree this is a SQL sin and probably can be done with tables, I figured that it is easier to read and write to during development

### JSDoc TypeDefinitions

If you switch to TypeScript you can ignore this section. 

Our solution to JavaScript being a pain was to implement advanced JSDoc'ing this will enable you intellisense to some degree. This is by no means a robust system and will need to be added to for new types in the future

Unfortunately there is also a type naming mismatch in `CourseInput` called `subject` which does not follow the convention of `subj_expanded`

These definitions are found in `node/helpers/typedefs.js`

### Lodash

This project utilized a popular library called Lodash to offload a lot of the work done by the backend. There are many calls to the library in the `parser.js` file

The main reason we used this library instead of the built-in JS functions made by the previous team were because they are easier to read and understand.

### parser.js

Briefly I would like to go over `parser.js` because there is some arguably strange decisions made due to time constraints. 

`analyzeStudents()`: 
This method is the orchestrator for the flagging system. This is called by the submission import to and will call 2 sub-functions to handle processing and batching the flags. Once all the students are finished processing a batch will be returned. If you notice that courseInfo and fullDataInfo look really similar and can be put into 1 loop, we considered this but if there is an id missing in one of the fields we did not want to deal with a null pointer catch. If it is easier to place them both under 1 loop feel free to and handle the error.

`handlePolicyFlags()`:
This function appends on the p91 flags and batches the students' information and courses into the database format. Code such as:

`handleGradFlags()`:
Here is where the jank comes in. There are 3 helpers that are used to accomplish added grad requirements to the additional student: `validateCSRequirements`,  `validateDCCRequirements`, and  `validateSCRequirements`

Under those function rely on these 3 functions under the hood to run verification checks: 
`verifyAll`: Makes sure that all the courses have been taken calls the transformer `convertToComparable` to get courses taken and strip substitutions

`verifyMinNumber`: Makes sure that all the courses meet the minimum required for example: CS needs to take at least 1 4/5xxx elective

`verifyCount`: This does with `verifyMinNumber` does but returns the length of the overlap to calculate 3/4/5xxx courses. To be fair this method could not be combined with `verifyMinNumber` without returning a JSON object which defeats the SOLID principles of method creation


The validation functions will return all classes that have not been verified and append it to the missing courses object in `handleGradFlags`
