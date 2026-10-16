// Maintainer utility: export course rules only, never student data or credentials.
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('../../node/node_modules/mysql2/promise');
(async () => {
    if (!process.env.MYSQL_HOST || !process.env.MYSQL_DATABASE) throw new Error('Set MYSQL_HOST and MYSQL_DATABASE for the source database.');
    const connection = await mysql.createConnection({ host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT || 3306), user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD, database: process.env.MYSQL_DATABASE });
    try {
        const [rows] = await connection.query('SELECT year,subject,category,course_number,credit_hours,passing_grade,repeatable,conc_eligible,substitutes FROM Checksheet ORDER BY year,category,subject,course_number');
        const data = rows.map(row => [row.year, row.subject, row.category, row.course_number, row.credit_hours, row.passing_grade, row.repeatable, row.conc_eligible, typeof row.substitutes === 'string' ? JSON.parse(row.substitutes) : row.substitutes || []]);
        if (!data.length) throw new Error('No course rules found. Import database/init.sql first.');
        const output = path.resolve(__dirname, '../public/data/checksheets.json');
        fs.mkdirSync(path.dirname(output), { recursive: true });
        fs.writeFileSync(output, JSON.stringify(data));
        console.log(`Exported ${data.length} course rules for ${new Set(data.map(row => row[0])).size} years.`);
    } finally { await connection.end(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
