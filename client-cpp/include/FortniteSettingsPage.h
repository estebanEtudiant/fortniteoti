// ══════════════════════════════════════════════════════
//  FortniteSettingsPage.h — Edit GameUserSettings.ini
// ══════════════════════════════════════════════════════
#pragma once
#include <QWidget>
#include <QLabel>
#include <QLineEdit>
#include <QCheckBox>
#include <QComboBox>
#include <QPushButton>
#include <QStringList>
#include <QMap>

class FortniteSettingsPage : public QWidget {
    Q_OBJECT
public:
    explicit FortniteSettingsPage(QWidget* parent = nullptr);

private:
    QString               m_filePath;
    QStringList           m_rawLines;      // raw lines preserved for write-back
    QMap<QString,QString> m_values;        // keys from target section

    QLabel*      m_pathLbl   = nullptr;
    QLabel*      m_statusLbl = nullptr;
    QPushButton* m_saveBtn   = nullptr;

    // Display
    QLineEdit* m_resW   = nullptr;
    QLineEdit* m_resH   = nullptr;
    QComboBox* m_fsMode = nullptr;
    QCheckBox* m_vsync  = nullptr;
    QLineEdit* m_fpsLmt = nullptr;

    // Quality
    QComboBox* m_shadows  = nullptr;
    QComboBox* m_effects  = nullptr;
    QComboBox* m_postProc = nullptr;
    QComboBox* m_textures = nullptr;
    QComboBox* m_foliage  = nullptr;
    QComboBox* m_aa       = nullptr;
    QComboBox* m_gi       = nullptr;
    QComboBox* m_reflect  = nullptr;

    // Gameplay
    QCheckBox* m_motionBlur = nullptr;
    QCheckBox* m_showFps    = nullptr;

    void buildUi();
    void autoDetectPath();
    bool loadFile();
    bool saveFile();
    void populateUi();    // m_values → widgets
    void collectUi();     // widgets → m_values
    void applyPreset();
    void setStatus(const QString& msg, const QColor& col);
    QString getVal(const QString& key, const QString& def = {}) const;
};
