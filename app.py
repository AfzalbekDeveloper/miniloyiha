import seaborn as s
import matplotlib.pyplot as plt
df = s.load_dataset('mpg')
print(df.groupby('mpg')['name'].describe())

s.barplot(data=df, x='name', y='mpg')
plt.title('Tejamkorlik')
plt.show()