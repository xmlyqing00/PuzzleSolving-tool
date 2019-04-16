#include <iostream>
#include <string>
#include <fstream>
#include <stdexcept>
#include <cmath>

#include <opencv2/opencv.hpp>

using namespace std;

class GT {

public:
    int dx, dy;
    float rotation;

    GT(int _dx, int _dy, float _r): dx(_dx), dy(_dy), rotation(_r) {};
    friend ostream & operator<<(ostream &os, const GT & gt) {
        os << "(dx: " << gt.dx << " dy: " << gt.dy << " rotation: " << gt.rotation << ")";
        return os;
    }

};

class Puzzle {

public:
    string puzzle_path;
    string prefix;
    int puzzle_n;
    cv::Scalar bg_color;
    vector<cv::Mat> pieces;
    cv::Size piece_size;
    cv::Size img_size;

    vector<GT> gt;

    Puzzle(const string & _puzzle_path) {
        
        puzzle_path = _puzzle_path;

        // Read config
        string config_path = puzzle_path + "config.txt";
        int b, g, r;

        fstream file(config_path, fstream::in);

        if (!file.is_open()) {
            throw invalid_argument("Config file does not exist.");
        }
        
        getline(file, prefix);
        file >> puzzle_n;
        file >> b >> g >> r;
        bg_color = cv::Scalar(b, g, r);
        file.close();

        cout << "Prefix: " << prefix << endl;
        cout << "Piece num: " << puzzle_n << endl;
        cout << "Puzzle path: " << puzzle_path << endl;
        cout << "Background color: " << bg_color << endl;

        // Read pieces
        for (int i = 0; i < puzzle_n; i++) {
            pieces.push_back(read_piece(i));
        }

        piece_size = pieces[0].size();

        cout << "Piece size: " << piece_size << endl;
        cout << "Loaded all pieces.\n" << endl;
    }

    cv::Mat read_piece(int idx) {

        assert(idx >= 0 && idx < puzzle_n);

        string piece_path = puzzle_path + prefix + to_string(idx) + ".png";
        cv::Mat piece = cv::imread(piece_path);
        return piece;

    }

    void read_groundtruth() {
        
        string gt_path = puzzle_path + "groundtruth.txt";
        fstream file(gt_path, fstream::in);

        if (!file.is_open()) {
            throw invalid_argument("Groundtruth file does not exist.");
        }

        gt.clear();
        for (int i = 0; i < puzzle_n; i++) {
            int dx, dy;
            float rotation;
            file >> dx >> dy >> rotation;
            gt.push_back(GT(dx, dy, rotation));
        }

        int max_h = 0;
        int max_w = 0;
        for (int i = 0; i < puzzle_n; i++) {
            max_h = max(max_h, piece_size.height + gt[i].dy);
            max_w = max(max_w, piece_size.width + gt[i].dx);
        }
        
        img_size = cv::Size(max_w, max_h);

        cout << "Expected size of the original image: " << img_size << endl;
        cout << "Loaded groundtruth.\n" << endl;

    }

    void apply_grountruth(int idx, bool display=false) {

        assert(idx >= 0 && idx < puzzle_n);

        cout <<"Idx: " << idx << " GT: " << gt[idx] << endl;

        float degree = -gt[idx].rotation / M_PI * 180;
        cv::Mat rotation_mat = cv::getRotationMatrix2D(
            cv::Point2f(piece_size.width / 2, piece_size.height / 2),
            degree, 1);
        cv::Mat piece_rotcr;
        cv::warpAffine(pieces[idx], piece_rotcr, rotation_mat, piece_size, 
            1, cv::BORDER_CONSTANT, bg_color);
        
        cv::Mat canvas = cv::Mat::zeros(img_size, CV_8UC3);
        
        int dst_y = max(0, gt[idx].dy);
        int dst_x = max(0, gt[idx].dx);
        int src_y = dst_y - gt[idx].dy;
        int src_x = dst_x - gt[idx].dx;
        cv::Size roi_size(piece_size.width - src_x, piece_size.height - src_y);

        cv::Rect src_rect(src_x, src_y, roi_size.width, roi_size.height);
        cv::Rect dst_rect(dst_x, dst_y, roi_size.width, roi_size.height);

        cv::Mat mask;
        cv::bitwise_xor(piece_rotcr, bg_color, mask);
        mask = mask != 0;
        piece_rotcr(src_rect).copyTo(canvas(dst_rect), mask(src_rect));

        if (display) {
            cv::imshow("piece", pieces[idx]);
            cv::imshow("canvas", canvas);
            cv::waitKey();
        }

    }

};

int main() {

    // Load puzzle to memory
    string puzzle_path = "../data/puzzles/10/";
    Puzzle puzzle(puzzle_path);
    puzzle.read_groundtruth();

    // Apply groundtruth to one piece, then show it.
    int piece_idx = 10;
    puzzle.apply_grountruth(piece_idx, true);

    return 0;

}