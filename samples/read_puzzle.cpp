#include <iostream>
#include <string>
#include <fstream>

#include <opencv2/opencv.hpp>

using namespace std;

class Puzzle {

public:
    string puzzle_path;
    string prefix;
    int puzzle_n;
    cv::Scalar bg_color;
    vector<cv::Mat> pieces;

    Puzzle(const string & _puzzle_path) {
        
        puzzle_path = _puzzle_path;

        // Read config
        string config_path = puzzle_path + "config.txt";
        int b, g, r;

        fstream file(config_path, fstream::in);
        getline(file, prefix);
        file >> puzzle_n;
        file >> b >> g >> r;
        bg_color = cv::Scalar(b, g, r);
        file.close();

        cout << prefix << " " << puzzle_n << endl;
        cout << "Puzzle path: " << puzzle_path << endl;
        cout << "Background color: " << bg_color << endl;

        // Read pieces
        for (int i = 0; i < puzzle_n; i++) {
            pieces.push_back(read_piece(i));
        }

        for (int i = 0; i < puzzle_n; i++) {
            cv::imshow("piece", pieces[i]);
            cv::waitKey();
        }
    }

    cv::Mat read_piece(int idx) {

        assert(idx >= 0 && idx < puzzle_n);

        string piece_path = puzzle_path + prefix + to_string(idx) + ".png";
        cv::Mat piece = cv::imread(piece_path);
        return piece;

    }

};

int main() {

    // Load puzzle to memory
    string puzzle_path = "data/puzzles/10/";
    Puzzle puzzle(puzzle_path);

    return 0;

}