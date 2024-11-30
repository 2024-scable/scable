from jenkinsapi.jenkins import Jenkins
from config import Config
class JenkinsEngine:
    def __init__(self):
        self.server = Jenkins(Config.JENKINS_URL, username=Config.JENKINS_USER, password=Config.JENKINS_API_TOKEN)

    def printServerVersion(self):
        user = self.server.username
        version = self.server.version
        print(f"Jenkins Version: {version}, Connected by {user}")
    
    def createJob(self,jobName, config):
        result = self.server.create_job(jobname=jobName, xml=config.encode("utf-8"))
        print(result)
    
    def buildJob(self,jobName, params=None):
        if(params != None):
            self.server.build_job(jobname=jobName, params=params)
        else:
            self.server.build_job(jobname=jobName)       
    
    def isAlreadyJob(self, jobName):
        jobList = self.server.get_jobs_list()
        
        if(jobName in jobList):
            return True
        else:
            return False
        
