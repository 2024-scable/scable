from rapidfuzz import fuzz
from rapidfuzz.distance import Levenshtein
from pybktree import BKTree
from config import Config
import pandas as pd

def load_famous_libraries_from_excel(file_path):
    df = pd.read_excel(file_path, engine='openpyxl')
    famous_libraries = df.iloc[:, 0].dropna().str.lower().tolist()

    return set(pkg.lower() for pkg in famous_libraries)

def editDistance(s1, s2):
    return Levenshtein.distance(s1, s2)

def initBKTree(packageList):
    return BKTree(editDistance, packageList)

class TypoSquattingChecker:
    def __init__(self, language):
        self.packageList = self.getTopPackages(language)
        self.bkTree = initBKTree(self.packageList)
    
    def getTopPackages(self,language):
        if(language == "python"):
            return load_famous_libraries_from_excel(Config.PYPI_FAMOUS_PACKAGE_EXCEL_PATH)
        
        elif(language == "java" or language == "kotlin"):
            return load_famous_libraries_from_excel(Config.MAVEN_FAMOUS_PACKAGE_EXCEL_PATH)
        
        elif(language == "javascript"):
            return load_famous_libraries_from_excel(Config.NPM_FAMOUS_PACKAGE_EXCEL_PATH)
    
    def checkExactPackageName(self, packageName):
        return packageName.lower() in self.packageList

    def calcTyposquatting(self, target, maxDistance=2, similarityThreshold=90):
        component_name_lower = target.lower()
        candidates = self.bkTree.find(component_name_lower, maxDistance)
        similar = []
            
        for distance, name in candidates:
            similarity = fuzz.ratio(component_name_lower, name.lower())
            if similarity >= similarityThreshold:
                similar.append((name, similarity))

        similar.sort(key=lambda x: x[1], reverse=True)
        return similar
    
    def check_typo_squatting(self, package_name):
        similar_packages = self.calcTyposquatting(package_name)
        if similar_packages:
            highest_similarity = max(similar_packages, key=lambda x: x[1])
            return True, highest_similarity, similar_packages
        return False, None, []
