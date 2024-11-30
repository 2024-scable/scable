from rapidfuzz import fuzz
from rapidfuzz.distance import Levenshtein
from pybktree import BKTree


def editDistance(s1, s2):
    return Levenshtein.distance(s1, s2)

def initBKTree(packageList):
    return BKTree(editDistance, packageList)

class TypoSquattingChecker:
    def __init__(self, packageList):
        self.packageList = set(pkg.lower() for pkg in packageList)
        self.bkTree = initBKTree(self.packageList)
    
    def checkExactPackageName(self, packageName):
        return packageName.lower() in self.packageList

    def checkTyposquatting(self, target, maxDistance=2, similarityThreshold=90):
        component_name_lower = target.lower()
        candidates = self.bkTree.find(component_name_lower, maxDistance)
        similar = []
        for distance, name in candidates:
            similarity = fuzz.ratio(component_name_lower, name.lower())
            if similarity >= similarityThreshold:
                similar.append((name, similarity))

        similar.sort(key=lambda x: x[1], reverse=True)
        return similar
