def exercise1():
    return """
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
class LinearRegression:
    def fit(self,X,y):
        m = X.shape[0]
        X_mean, y_mean = np.mean(X), np.mean(y)
        X_mean_diff, y_mean_diff = X-X_mean, y-y_mean
        self.b1 = (X_mean_diff @ y_mean_diff) / (X_mean_diff @ X_mean_diff)
        self.b0 = y_mean - (self.b1 * X_mean)
        print(f"(b0,b1):({self.b0:.3f},{self.b1:.3f})")
        return self
    
    def predict(self,X):
        return self.b0 + X*self.b1

    def evaluate(self,X,y):
        y_pred = self.predict(X)
        y_diff,y_mean_diff  = y-y_pred , y-np.mean(y)
        rmse = np.sqrt(y_diff @ y_diff/X.shape[0])
        ss_tot = y_mean_diff @ y_mean_diff
        ss_res = y_diff @ y_diff
        r2 = 1 - ss_res/ss_tot
        print("Root mean squared Error:",rmse)
        print("R^2 value:",r2)

def regression_plot(X,y,model,title=""):
    plt.figure(figsize=(14,7))
    plt.title(title)
    plt.xlabel("Head Size(cm^3)")
    plt.ylabel("Brain Weights(grams)")
    
    x_line = np.array([np.min(X) - 100,np.max(X) + 100]).reshape(-1,1)
    y_line = model.predict(x_line)
    
    plt.scatter(X, y,c='orange', label='Original Data Points')
    plt.plot(x_line, y_line,linewidth=4, label='Regression Line')
    plt.legend()

data = pd.read_csv('./datasets/headbrain.csv')
print("size:",data.size,"; shape",data.shape)
data.head()

X = data['Head Size(cm^3)'].values
y = data['Brain Weight(grams)'].values

lin_reg_model= LinearRegression()
lin_reg_model.fit(X,y)
regression_plot(X,y,lin_reg_model,title="Regression Using Oridinary Least Squares Method")
lin_reg_model.evaluate(X,y)
"""