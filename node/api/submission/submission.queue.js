/**
 * Queue manager for submission processing
 * Allows multiple submissions to be queued and processed sequentially
 */

const Log = require('../../database/utils/Log');

class SubmissionQueue {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.currentJob = null;
    }

    /**
     * Add a submission job to the queue
     * @param {Object} job - Job object containing { id, details, file, fullDataFile, worker }
     * @returns {Object} Job with queue position and estimated wait time
     */
    async enqueue(job) {
        const queuePosition = this.queue.length + (this.isProcessing ? 1 : 0);
        
        job.queuedAt = Date.now();
        job.status = 'queued';
        job.position = queuePosition;
        
        this.queue.push(job);
        
        Log.info(`Submission queued: ${job.id}, position: ${queuePosition}`, job.details.initiatingUser);
        
        // Start processing if not already running
        if (!this.isProcessing) {
            this.processNext();
        }
        
        return {
            jobId: job.id,
            position: queuePosition,
            queueLength: this.queue.length,
            estimatedWaitTime: this.getEstimatedWaitTime()
        };
    }

    /**
     * Process the next job in the queue
     */
    async processNext() {
        if (this.queue.length === 0) {
            this.isProcessing = false;
            this.currentJob = null;
            return;
        }

        this.isProcessing = true;
        const job = this.queue.shift();
        this.currentJob = job;
        
        job.status = 'processing';
        job.startedAt = Date.now();
        
        // Update positions for remaining jobs
        this.queue.forEach((j, index) => {
            j.position = index + 1;
        });

        Log.info(`Processing submission: ${job.id}`, job.details.initiatingUser);

        try {
            // Execute the worker function
            await job.worker(job.submissionImportInfo);
            
            job.status = 'completed';
            job.completedAt = Date.now();
            job.duration = job.completedAt - job.startedAt;
            
            Log.info(`Submission completed: ${job.id}, duration: ${job.duration}ms`, job.details.initiatingUser);
            
            // Call success callback if provided
            if (job.onSuccess) {
                job.onSuccess();
            }
        } catch (error) {
            job.status = 'failed';
            job.error = error.message;
            job.completedAt = Date.now();
            
            Log.error(`Submission failed: ${job.id}, error: ${error.message}`, job.details.initiatingUser);
            
            // Call error callback if provided
            if (job.onError) {
                job.onError(error);
            }
        }

        // Process next job
        this.processNext();
    }

    /**
     * Get queue status
     * @returns {Object} Current queue status
     */
    getStatus() {
        return {
            isProcessing: this.isProcessing,
            currentJob: this.currentJob ? {
                id: this.currentJob.id,
                status: this.currentJob.status,
                initiatingUser: this.currentJob.details.initiatingUser,
                startedAt: this.currentJob.startedAt,
                duration: this.currentJob.startedAt ? Date.now() - this.currentJob.startedAt : 0
            } : null,
            queueLength: this.queue.length,
            queuedJobs: this.queue.map(job => ({
                id: job.id,
                position: job.position,
                initiatingUser: job.details.initiatingUser,
                queuedAt: job.queuedAt
            }))
        };
    }

    /**
     * Get job status by ID
     * @param {string} jobId 
     * @returns {Object|null} Job status or null if not found
     */
    getJobStatus(jobId) {
        // Check current job
        if (this.currentJob && this.currentJob.id === jobId) {
            return {
                id: this.currentJob.id,
                status: this.currentJob.status,
                position: 0,
                startedAt: this.currentJob.startedAt,
                duration: this.currentJob.startedAt ? Date.now() - this.currentJob.startedAt : 0
            };
        }

        // Check queued jobs
        const queuedJob = this.queue.find(job => job.id === jobId);
        if (queuedJob) {
            return {
                id: queuedJob.id,
                status: queuedJob.status,
                position: queuedJob.position,
                queuedAt: queuedJob.queuedAt,
                estimatedWaitTime: this.getEstimatedWaitTime()
            };
        }

        return null;
    }

    /**
     * Estimate wait time based on average processing time
     * @returns {number} Estimated wait time in milliseconds
     */
    getEstimatedWaitTime() {
        // If no job is processing, wait time is 0
        if (!this.isProcessing) return 0;

        // Rough estimate: assume 30 seconds per job
        const avgJobTime = 30000; // 30 seconds
        const jobsAhead = this.queue.length + (this.isProcessing ? 1 : 0);
        
        return jobsAhead * avgJobTime;
    }

    /**
     * Cancel a queued job
     * @param {string} jobId 
     * @returns {boolean} True if cancelled, false if not found or already processing
     */
    cancelJob(jobId) {
        const index = this.queue.findIndex(job => job.id === jobId);
        
        if (index !== -1) {
            const job = this.queue.splice(index, 1)[0];
            job.status = 'cancelled';
            
            // Update positions for remaining jobs
            this.queue.forEach((j, idx) => {
                j.position = idx + 1;
            });
            
            Log.info(`Submission cancelled: ${jobId}`, job.details.initiatingUser);
            return true;
        }
        
        return false;
    }

    /**
     * Clear all queued jobs (does not stop current processing job)
     */
    clearQueue() {
        const cleared = this.queue.length;
        this.queue = [];
        Log.warn(`Cleared ${cleared} jobs from submission queue`);
        return cleared;
    }
}

// Singleton instance
const submissionQueue = new SubmissionQueue();

module.exports = submissionQueue;
