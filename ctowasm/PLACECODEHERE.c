int main() {
  int i = 3;
  int* pi = &i;
  int **ppi = &pi;
  **ppi;
}