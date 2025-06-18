#include <source_stdlib>
#include <utility>

// data allocation
char global_string[] = "THIS IS ON THE DATA SEGMENT";

int main() {
  // stack allocation
  char stack_string[] = "THIS IS ON THE STACK";

  // heap allocation
  char* heap_string = malloc(sizeof(char) * 20);
  heap_string[0] = 'T';
  heap_string[1] = 'H';
  heap_string[2] = 'I';
  heap_string[3] = 'S';
  heap_string[4] = ' ';
  heap_string[5] = 'I';
  heap_string[6] = 'S';
  heap_string[7] = ' ';
  heap_string[8] = 'O';
  heap_string[9] = 'N';
  heap_string[10] = ' ';
  heap_string[11] = 'T';
  heap_string[12] = 'H';
  heap_string[13] = 'E';
  heap_string[14] = ' ';
  heap_string[15] = 'H';
  heap_string[16] = 'E';
  heap_string[17] = 'A';
  heap_string[18] = 'P';
  heap_string[19] = '\0';
}